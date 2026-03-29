const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

/* ================= MongoDB ================= */

// ⚠️ عدل الرابط هنا (حط بياناتك الصح)
mongoose.connect("mongodb+srv://TwilightCity:FK10149KF@twilightcity.gaqdkk1.mongodb.net/tcs_store?retryWrites=true&w=majority")
.then(()=> console.log("✅ MongoDB connected"))
.catch(err=> console.log("❌ Mongo Error:", err));

/* ================= Models ================= */

const User = mongoose.model('User',{
    username: String,
    email: String,
    password: String
});

const Order = mongoose.model('Order',{
    username: String,
    email: String,
    productName: String,
    price: String,
    paymentId: String,
    date: String
});

/* ================= Routes ================= */

// الصفحة الرئيسية
app.get('/', (req,res)=>{
    res.send('Backend is working ✅');
});

/* ================= USERS ================= */

// تسجيل
app.post('/api/register', async (req,res)=>{
    try{
        const {username,email,password} = req.body;

        const exist = await User.findOne({email});
        if(exist){
            return res.json({success:false,message:'البريد مستخدم'});
        }

        const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
        if(!strong.test(password)){
            return res.json({success:false,message:'كلمة المرور ضعيفة'});
        }

        const hash = await bcrypt.hash(password,10);

        await User.create({
            username,
            email,
            password:hash
        });

        res.json({success:true,message:'تم إنشاء الحساب'});
    }catch(err){
        console.error(err);
        res.json({success:false,message:'خطأ في السيرفر'});
    }
});

// تسجيل دخول
app.post('/api/login', async (req,res)=>{
    try{
        const {email,password} = req.body;

        const user = await User.findOne({email});
        if(!user){
            return res.json({success:false,message:'البريد غير صحيح'});
        }

        const match = await bcrypt.compare(password,user.password);
        if(!match){
            return res.json({success:false,message:'كلمة المرور خاطئة'});
        }

        res.json({
            success:true,
            user:{
                username:user.username,
                email:user.email
            }
        });

    }catch(err){
        console.error(err);
        res.json({success:false,message:'خطأ في السيرفر'});
    }
});

/* ================= ORDERS ================= */

// حفظ طلب
app.post('/api/orders', async (req,res)=>{
    try{
        const order = req.body;

        await Order.create({
            ...order,
            date: new Date().toLocaleString()
        });

        console.log("📦 Order saved");

        res.json({success:true});
    }catch(err){
        console.error(err);
        res.json({success:false});
    }
});

// جلب الطلبات
app.get('/api/orders', async (req,res)=>{
    const orders = await Order.find();
    res.json(orders);
});

// حذف الطلبات
app.delete('/api/orders', async (req,res)=>{
    await Order.deleteMany({});
    res.json({success:true});
});

/* ================= START ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, ()=>console.log('🚀 Server running on port '+PORT));