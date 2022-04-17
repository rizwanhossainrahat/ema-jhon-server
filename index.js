const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
const { initializeApp } = require('firebase-admin/app');
var admin = require("firebase-admin");
require('dotenv').config();


const app = express();
const port = process.env.PORT || 5000;

// firebase admin initialiazation


var serviceAccount = require('./ema-john-simple-88ef7-firebase-adminsdk-t621o-19f336ff21.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middlewear
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iwcqk.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
console.log(uri)

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        
        // console.log('inside function',idToken);
        try {
            const idToken = req.headers.authorization.split('Bearer ')[1];
           const decodedUser=await admin.auth().verifyIdToken(idToken);
           console.log(decodedUser.email);
           req.decodedUserEmail=decodedUser.email
        }
        catch {

        }
    }
    next()
}

async function run() {
    try {
        await client.connect()
        const database = client.db('online_shop');
        const productCollection = database.collection('products')
        const orderCollection = database.collection('orders')

        // get products  
        app.get('/products', async (req, res) => {
            console.log(req.query);
            const cursor = productCollection.find({})
            // const products=await cursor.limit(10).toArray();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray()
            }
            else {
                products = await cursor.toArray();
            }


            res.send({
                count,
                products
            });
        });

        // use post to get data by keys
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.json(products);
        });

        // add order api
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
               const query = { email: email }
                const cursor = orderCollection.find(query)
                const orders = await cursor.toArray()
                res.json(orders)
            }
            else{
                res.status(401).json({message:'User not authorized'})
            }
             
        });

        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

    }
    finally {
        //    await client.close()
    }
}

run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('ema jhon server is running')
});

app.listen(port, () => {
    console.log("your port is", port)
})