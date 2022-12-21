const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// JWT....
const jwt = require('jsonwebtoken');

require('dotenv').config()

app.use(cors())
app.use(express.json())

// store_admin
// 20WqhoXEUKDF8NJQ

// d1076924a19355f29acac0f38e6ccdc8443a5276d24f300a270e0734ee104b148b85fc8485f5ac0b83666bbda41d6c88d1686991ea6e0c3fed3096e4b8356e41



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxxdu9r.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// JWT (VERIFY)...
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorize Access' })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        console.log(decoded)
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect()
        // console.log('database connected')
        const allproductsCollection = client.db('store_management').collection('allproducts')
        const usersCollection = client.db('store_management').collection('users')

        // Rad/Get ... (allProducts)
        app.get('/allproducts', async (req, res) => {
            const query = {}
            const cursor = allproductsCollection.find(query)
            const allproducts = await cursor.toArray()
            res.send(allproducts)
        })

        // Rad/Get ... (Shoes)
        app.get('/products', async (req, res) => {
            const item=req.query.item
            const query = { generalName: item }
            const cursor = allproductsCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        })
        // (USER) create/update....
        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            console.log(user)
            const filter = { email: email }
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            //   JWT TOKEN generate....
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '200h' })
            res.send({ result, token })
        })

        // Read/Get all ...(USERS)
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find().toArray();
            res.send(users)
        })
        // Delete (user)
        app.delete('/deleteUsers/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })

        // (Super Admin) ...Create
        app.put('/user/superAdmin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            // const user = req.body

            // const options = { upsert: true };
            const requester = req.decoded.email
            const requesterAccount = await usersCollection.findOne({ email: requester })
            if (requesterAccount.role === 'SuperAdmin') {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: 'SuperAdmin' },
                };
                const result = await usersCollection.updateOne(filter, updateDoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        })

        // FOR (useSuperAdmin)
        app.get('/superAdmin/:email', async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email: email })
            const isSuperAdmin = user.role === "SuperAdmin";
            res.send({ SuperAdmin: isSuperAdmin })
        })

        // delete....
        app.delete('/allproducts/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: ObjectId(id) }
            const result = await allproductsCollection.deleteOne(query)
            res.send(result)
        })

        //post/Add (PRODUCT)
        app.post('/allproducts',async (req,res)=>{
            console.log('SERVER ',req.body)
            const newDevice=req.body
            console.log('body',newDevice)
            const result=await allproductsCollection.insertOne(newDevice)
            res.send(result)
        })

    }
    finally {
        // await client.close()
    }

}

run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Hello From STORE-MANAGEMENT')
})

app.listen(port, () => {
    console.log(`Listening to port ${port}`)
    console.log('port on', port)
})