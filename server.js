const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 سر التوكن
const SECRET = "TCS_SECRET_123";

// 🟢 Mongo
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log("✅ MongoDB connected"))
.catch(err=> console.log(err));

// ================= MODELS =================

const userSchema = new mongoose.Schema({
    username:String,
    email:String,
    password:String,
    role:{type:String, default:"user"}
});

const User = mongoose.model('User', userSchema);

const orderSchema = new mongoose.Schema({
    username:String,
    email:String,
    productName:String,
    price:Number,
    paymentId:String,
    date:String
});

const Order = mongoose.model('Order', orderSchema);

// ================= MIDDLEWARE =================

// تحقق تسجيل دخول
function auth(req,res,next){
    const token = req.headers.authorization;
    if(!token) return res.status(401).json({message:"Not logged in"});

    try{
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    }catch{
        res.status(401).json({message:"Invalid token"});
    }
}

// تحقق ادمن
function admin(req,res,next){
    if(req.user.role !== "admin"){
        return res.status(403).json({message:"Not admin"});
    }
    next();
}

// ================= ROUTES =================

app.get('/', (req,res)=>{
    res.send('Backend is working ✅');
});

// تسجيل
app.post('/api/register', async (req,res)=>{
    const {username,email,password} = req.body;

    const exist = await User.findOne({email});
    if(exist) return res.json({success:false,message:'البريد مستخدم'});

    const hash = await bcrypt.hash(password,10);

    await User.create({username,email,password:hash});

    res.json({success:true,message:'تم إنشاء الحساب'});
});

// تسجيل دخول
app.post('/api/login', async (req,res)=>{
    const {email,password} = req.body;

    const user = await User.findOne({email});
    if(!user) return res.json({success:false});

    const match = await bcrypt.compare(password,user.password);
    if(!match) return res.json({success:false});

    const token = jwt.sign({
        id:user._id,
        email:user.email,
        role:user.role
    }, SECRET);

    res.json({
        success:true,
        token,
        user:{
            username:user.username,
            email:user.email
        }
    });
});

// 🟢 طلب (محمي)
app.post('/api/orders', auth, async (req,res)=>{
    const order = req.body;
    order.date = new Date().toLocaleString();

    await Order.create(order);
    res.json({success:true});
});

// 🟢 جلب الطلبات (ادمن فقط)
app.get('/api/orders', auth, admin, async (req,res)=>{
    const orders = await Order.find();
    res.json(orders);
});

// 🟢 حذف الطلبات (ادمن)
app.delete('/api/orders', auth, admin, async (req,res)=>{
    await Order.deleteMany({});
    res.json({success:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('🚀 Server running'));