require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const { MongoClient } = require('mongodb')
const uri = "mongodb+srv://admin:csGr1IYTNTG5eXJU@aps.xpedu.mongodb.net/aps?retryWrites=true&w=majority";
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// crio um servidor express
const app = express();

// aplico configurações para dentro do servidor express, adicionando middlewares (body-parser, morgan, cors)
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

let refreshTokens = []
let users = [
    {
        username: "Victor",
        password: "$2b$10$yfub/4C0WApifzXbYXX05OmWVKBofmlXQI8xJLEWFjExy71TVpcZW"
    }
]

app.post('/token', (req, res) => {
    const refreshToken = req.body.token
    if(refreshToken == null) return res.sendStatus(401)
    if(!refreshTokens.includes(refreshToken)) return res.sendStatus(403)
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if(err) return res.sendStatus(403)
        const accessToken = generateAccessToken({ name: user.name })
        res.json({ accessToken })
    })
})

app.delete('/logout', (req, res) => {
    console.log(req.body)
    console.log(refreshTokens)
    refreshTokens = refreshTokens.filter(token => token !== req.body.token)
    console.log(refreshTokens)
    res.sendStatus(204)
})

app.get('/users', (req, res) => {
    res.json(users)
    console.log(
        jwt.verify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVmljdG9yIiwiaWF0IjoxNjMzNjI0MTQ0LCJleHAiOjE2MzM2MjQ3NDR9.K3CxzbB7wldT3vg9rvx4fIdITd7uIG4pbAzVmGiSogc',process.env.ACCESS_TOKEN_SECRET)
    )
})

app.post('/users', async (req, res) => {
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        const user = { username: req.body.username, password: hashedPassword }
        client.connect(async err => {
            const collection = client.db("aps").collection("users");
            const userCursor = collection.find({username: user.username})
            const userInfo = await userCursor.hasNext() ? userCursor.next() : null
            if(userInfo){
                client.close()
                res.status(403).json({message: 'Usuário já existe'}).end()
            } else {
                await collection.insertOne(user).then(value => {
                    const id = value.insertedId.toString()
                    client.close()
                    res.status(201).json({ message: `Usuário criado com sucesso`, id })
                })
                
            }
        });
    } catch {
        res.sendStatus(500)
    }
})

app.post('/login', async (req, res) => {
    const username = req.body.username
    const password = req.body.password

    client.connect(async err => {
        const collection = client.db("aps").collection("users");
        const userCursor = collection.find({username: username})
        const userInfo = await userCursor.hasNext() ? userCursor.next() : null
        if(userInfo){
            userInfo.then(async data => {
                try {
                    if (await bcrypt.compare(password, data.password)){
                        const user = { name: username }
                        const accessToken = generateAccessToken(user)
                        const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET)
                        refreshTokens.push(refreshToken)
                        res.json({ accessToken, refreshToken })
                    } else {
                        res.status(403).send({ message: "Accesso negado" })
                    }
                } catch (err) {
                    res.sendStatus(500)
                }
            })
        } else {
            client.close()
            res.status(403).json({ message: 'Usuário não encontrado' }).end()
        }
    });
});

function generateAccessToken(user) {
    return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10m' })
}

// o servidor irá rodar dentro da porta 9000
app.listen(8000, () => console.log('Express started at http://localhost:8000'));