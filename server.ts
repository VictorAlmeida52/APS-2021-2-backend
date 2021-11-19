require('dotenv').config()
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');


// crio um servidor express
const app = express();

// aplico configurações para dentro do servidor express, adicionando middlewares (body-parser, morgan, cors)
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());

// DB local (tempo de execução)
const uf = [
    {
        "nome": "Acre",
        "sigla": "AC",
        "estado_id": "12"
    },
    {
        "nome": "Alagoas",
        "sigla": "AL",
        "estado_id": "27"
    },
    {
        "nome": "Amapá",
        "sigla": "AP",
        "estado_id": "16"
    },
    {
        "nome": "Amazonas",
        "sigla": "AM",
        "estado_id": "13"
    },
    {
        "nome": "Bahia",
        "sigla": "BA",
        "estado_id": "29"
    },
    {
        "nome": "Ceará",
        "sigla": "CE",
        "estado_id": "23"
    },
    {
        "nome": "Distrito Federal",
        "sigla": "DF",
        "estado_id": "53"
    },
    {
        "nome": "Espírito Santo",
        "sigla": "ES",
        "estado_id": "32"
    },
    {
        "nome": "Goiás",
        "sigla": "GO",
        "estado_id": "52"
    },
    {
        "nome": "Maranhão",
        "sigla": "MA",
        "estado_id": "21"
    },
    {
        "nome": "Mato Grosso",
        "sigla": "MT",
        "estado_id": "51"
    },
    {
        "nome": "Mato Grosso do Sul",
        "sigla": "MS",
        "estado_id": "50"
    },
    {
        "nome": "Minas Gerais",
        "sigla": "MG",
        "estado_id": "31"
    },
    {
        "nome": "Pará",
        "sigla": "PA",
        "estado_id": "15"
    },
    {
        "nome": "Paraíba",
        "sigla": "PB",
        "estado_id": "25"
    },
    {
        "nome": "Paraná",
        "sigla": "PR",
        "estado_id": "41"
    },
    {
        "nome": "Pernambuco",
        "sigla": "PE",
        "estado_id": "26"
    },
    {
        "nome": "Piauí",
        "sigla": "PI",
        "estado_id": "22"
    },
    {
        "nome": "Rio de Janeiro",
        "sigla": "RJ",
        "estado_id": "33"
    },
    {
        "nome": "Rio Grande do Norte",
        "sigla": "RN",
        "estado_id": "24"
    },
    {
        "nome": "Rio Grande do Sul",
        "sigla": "RS",
        "estado_id": "43"
    },
    {
        "nome": "Rondônia",
        "sigla": "RO",
        "estado_id": "11"
    },
    {
        "nome": "Roraima",
        "sigla": "RR",
        "estado_id": "14"
    },
    {
        "nome": "Santa Catarina",
        "sigla": "SC",
        "estado_id": "42"
    },
    {
        "nome": "São Paulo",
        "sigla": "SP",
        "estado_id": "35"
    },
    {
        "nome": "Sergipe",
        "sigla": "SE",
        "estado_id": "28"
    },
    {
        "nome": "Tocantins",
        "sigla": "TO",
        "estado_id": "17"
    }

]

const posts = [
    {
        username: 'Victor',
        title: 'POST 1'
    },
    {
        username: 'Hugo',
        title: 'POST 2'
    }
]

// Retorna listagem de UF
app.get('/posts', authenticateToken, (req: any, res: any) => {
    req.user
    res.json(posts.filter(post => post.username === req.user.name))
});

function authenticateToken(req: any, res: any, next: any) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.sendStatus(401)

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err: any, user: any) => {
        if(err) return res.sendStatus(403)
        req.user = user
        next()
    })
}

// Retorna listagem de UF
app.get('/uf', (req: any, res: any) => {
    res.send(uf)
});

// Retorna dados de queimadas no estado informado
app.get('/queimadas', async (req: any, res: any) => {

    const requested_state: string = (req.query.estado).toUpperCase()    

    if(!requested_state) {
        return res.status(400).end()
    }

    if(requested_state == "NULL"){
        res.send(JSON.stringify([]));
    }
    
    const requested_uf = uf.filter(obj => {return obj.sigla === requested_state})
    let requested_id: number
    if(Array.isArray(requested_uf) && requested_uf.length){
        requested_id = Number.parseInt(requested_uf[0].estado_id)
        let url = `http://queimadas.dgi.inpe.br/api/focos?pais_id=33&estado_id=${requested_id}`;
        
        axios({
            method:'get',
            url
        })
        .then((response: any) => {
            const resultArray: Array<Object> = [];
            
            (response.data).forEach((data: any) => {
                resultArray.push({
                    id: data.id,
                    latitude: data.properties.latitude,
                    longitude: data.properties.longitude,
                    satelite: data.properties.satelite,
                    estado: data.properties.estado,
                    municipio: data.properties.municipio,
                    data_hora_gmt: data.properties.data_hora_gmt
                })
            });
            res.send(JSON.stringify(resultArray));
        })
        .catch((error: any) => {
            console.log(error);
        });
    } else {
        res.status(404).end()
    }
        
})

app.get('/acidentes', async (req: any, res: any) => {

    // if(!req.body){
    //     res.status(400).end()
    // }
    
    let url = `http://siscom.ibama.gov.br/geoserver/publica/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=publica:adm_comunicacidente_p&maxFeatures=500&outputFormat=application%2Fjson`;
    let urlCheckTotalFeatures = `http://siscom.ibama.gov.br/geoserver/publica/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=publica:adm_comunicacidente_p&maxFeatures=1&outputFormat=application%2Fjson`;
    let total
        
    axios({
        method:'get',
        url
    }).then((response: any) => {})

    axios({
        method:'get',
        url
    })
    .then((response: any) => {
        const resultArray: Array<Object> = [];
        const result = (response.data.features).map((obj: any) => {
            
            const props = obj.properties
            return { 
                total: response.data.totalFeatures,
                id: obj.id,
                latitude: obj.geometry.coordinates[1],
                longitude: obj.geometry.coordinates[0],
                des_ocorrencia: props.des_ocorrencia,
                data_registro: props.dt_registro,
                municipio: props.municipio,
                estado: props.uf,
                origem: props.origem,
                tipo: props.tipo_evento,
                feriado: props.dt_ocorrencia_feriado,
                instituicoes_atuando_local: props.instituicoes_atuando_local | props.institiuicoes_atuando_local,
                danos: props.tipos_danos_identificados
             }
        })
        res.send(JSON.stringify(result));
    })
    .catch((error: any) => {
        console.log(error);
    });

})

app.post('/add', (req: any, res: any) => {
    const result = req.body

    if (!result) {
        return res.status(400).end()
    }

    uf.push(result);
    return res.json({ result })
});

// o servidor irá rodar dentro da porta 9000
app.listen(9000, () => console.log('Express started at http://localhost:9000'));