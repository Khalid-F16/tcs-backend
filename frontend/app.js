const API="https://tcs-backend-oxa4.onrender.com";

let cart=[];
let allProducts = [];
let selectedProduct = null;

// 👁 إظهار كلمة المرور
function togglePassword(){
    const input = document.getElementById("password");
    input.type = input.type === "password" ? "text" : "password";
}

// ================= LOGIN =================
async function login(){
    const res = await fetch(API+'/api/login',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            email:email.value,
            password:password.value
        })
    });

    const data = await res.json();

    if(data.success){
        localStorage.setItem('token',data.token);
        localStorage.setItem('user',JSON.stringify(data.user));
        location='store.html';
    }else{
        alert("خطأ");
    }
}

// ================= REGISTER =================
async function register(){
    await fetch(API+'/api/register',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
            username:username.value,
            email:email.value,
            password:password.value
        })
    });

    alert("تم التسجيل");
    location='index.html';
}

// ================= LOAD PRODUCTS =================
let currentPage = 1;
let totalPages = 1;

async function loadProducts(page=1){

    currentPage = page;

    products.innerHTML = "⏳ جاري التحميل...";

    const res = await fetch(API+`/api/products?page=${page}&limit=6`);
    const data = await res.json();

    allProducts = data.products;
    totalPages = data.pages;

    renderProducts(allProducts);
    renderPagination();
}

// ================= RENDER =================
function renderProducts(list){
    products.innerHTML='';

    const user = JSON.parse(localStorage.getItem('user'));

    list.forEach(p=>{

        let adminButtons = "";

        if(user && user.role === "admin"){
            adminButtons = `
                <button onclick="editProduct('${p._id}','${p.name}','${p.price}','${p.description}')">✏️</button>
                <button onclick="deleteProduct('${p._id}')">🗑</button>
            `;
        }

        products.innerHTML+=`
        <div class="product" onclick='openProduct(${JSON.stringify(p)})'>

            <img src="${p.image}">
            <h3>${p.name}</h3>
            <p>${p.price}$</p>

            <button onclick="event.stopPropagation(); addToCart('${p.name}',${p.price})">
                شراء
            </button>

            ${adminButtons}

        </div>`;
    });
}
function renderPagination(){

    pagination.innerHTML = "";

    for(let i=1;i<=totalPages;i++){

        pagination.innerHTML += `
        <button 
            class="${i===currentPage ? 'active':''}" 
            onclick="loadProducts(${i})">
            ${i}
        </button>`;
    }
}

// ================= FILTER =================
function applyFilters(){
    const search = document.getElementById('searchInput').value.toLowerCase();
    const price = document.getElementById('priceFilter').value;

    let filtered = allProducts.filter(p=>{
        const matchName = p.name.toLowerCase().includes(search);

        let matchPrice = true;
        if(price === "low") matchPrice = p.price < 50;
        if(price === "mid") matchPrice = p.price >=50 && p.price <=150;
        if(price === "high") matchPrice = p.price > 150;

        return matchName && matchPrice;
    });

    renderProducts(filtered);
}

// ================= MODAL =================
function openProduct(p){
    selectedProduct = p;

    modalImage.src = p.image;
    modalName.innerText = p.name;
    modalDesc.innerText = p.description;
    modalPrice.innerText = p.price + "$";

    productModal.style.display = "flex";
}

function closeModal(){
    productModal.style.display = "none";
}

function buyFromModal(){
    addToCart(selectedProduct.name, selectedProduct.price);
    closeModal();
    notify("🛒 تمت إضافة المنتج للسلة");
}

// ================= CART =================
function addToCart(name,price){
    cart.push({name,price});
    renderCart();
}

function renderCart(){
    cartItems.innerHTML='';

    cart.forEach((item,index)=>{
        cartItems.innerHTML+=`
        <div class="item">
            ${item.name} - ${item.price}$ 
            <button onclick="removeFromCart(${index})">❌</button>
        </div>`;
    });

    cartItems.innerHTML += `
    <button onclick="clearCart()" style="background:red;margin-top:10px;">
        تفريغ السلة
    </button>`;
}

function removeFromCart(index){
    cart.splice(index,1);
    renderCart();
    notify("🗑 تم حذف المنتج");
}

function clearCart(){
    cart = [];
    renderCart();
    notify("🧹 تم تفريغ السلة");
}

// ================= PAYPAL =================
function checkout(){
    document.getElementById('paypal-container').innerHTML = "";

    paypal.Buttons({
        createOrder: (data, actions)=>actions.order.create({
            purchase_units:[{
                amount:{value:cart.reduce((a,b)=>a+b.price,0)}
            }]
        }),
        onApprove: (data, actions)=>actions.order.capture().then(()=>{
            notify("💳 تم الدفع بنجاح");
            cart=[];
            renderCart();
        })
    }).render('#paypal-container');
}

// ================= ADMIN =================
async function addProduct(){
    try{

        const name = document.getElementById('pname').value;
        const price = document.getElementById('pprice').value;
        const desc = document.getElementById('pdesc').value;
        const img = document.getElementById('pimg').files[0];

        if(!name || !price){
            notify("❌ املأ البيانات","error");
            return;
        }

        const form=new FormData();

        form.append("name",name);
        form.append("price",price);
        form.append("description",desc);
        form.append("image",img);

        const res = await fetch(API+'/api/products',{
            method:'POST',
            headers:{
                'Authorization':localStorage.getItem('token')
            },
            body:form
        });

        const data = await res.json();

        if(data.success){
            notify("✅ تم إضافة المنتج");

            // تنظيف الحقول
            pname.value="";
            pprice.value="";
            pdesc.value="";
            pimg.value="";

        }else{
            notify("❌ فشل","error");
        }

    }catch(err){
        console.error(err);
        notify("❌ خطأ","error");
    }
}

async function deleteProduct(id){
    await fetch(API+'/api/products/'+id,{
        method:'DELETE',
        headers:{'Authorization':localStorage.getItem('token')}
    });

    notify("🗑 تم الحذف");
    loadProducts();
}

function editProduct(id,name,price,desc){
    const newName = prompt("اسم المنتج",name);
    const newPrice = prompt("السعر",price);
    const newDesc = prompt("الوصف",desc);

    fetch(API+'/api/products/'+id,{
        method:'PUT',
        headers:{
            'Content-Type':'application/json',
            'Authorization':localStorage.getItem('token')
        },
        body:JSON.stringify({
            name:newName,
            price:newPrice,
            description:newDesc
        })
    });

    notify("✏️ تم التعديل");
    loadProducts();
}

// ================= ORDERS =================
async function loadOrders(){
    const res = await fetch(API+'/api/orders',{
        headers:{'Authorization':localStorage.getItem('token')}
    });

    const data = await res.json();

    ordersList.innerHTML='';

    data.forEach(o=>{
        ordersList.innerHTML+=`
        <div class="item">
            👤 ${o.username}<br>
            💰 ${o.price}$<br>
            📅 ${o.date}
        </div>`;
    });
}

// ================= USERS =================
async function loadUsers(){
    const res = await fetch(API+'/api/users',{
        headers:{'Authorization':localStorage.getItem('token')}
    });

    const data = await res.json();

    usersList.innerHTML='';

    data.forEach(u=>{
        usersList.innerHTML+=`
        <div class="item">
            👤 ${u.username}<br>
            📧 ${u.email}
        </div>`;
    });
}

// ================= LOGOUT =================
function logout(){
    localStorage.clear();
    location='index.html';
}

// ================= INIT =================
if(window.location.pathname.includes("store")){
    const user = JSON.parse(localStorage.getItem('user'));

    if(!user){
        location='index.html';
    }else{
        usernameBox.innerText=user.username;

        if(user.role==="admin"){
            adminBtn.style.display="block";
        }

        loadProducts();
    }
}
// حماية الداشبورد + تحميله
if(window.location.pathname.includes("dashboard")){

    const user = JSON.parse(localStorage.getItem('user'));

    if(!user){
        location='index.html';
    }else if(user.role !== "admin"){
        alert("❌ ليس لديك صلاحية");
        location='store.html';
    }else{
        // تحميل أول تبويب
        setTimeout(()=>{
            showTab('add');
        },100);
    }
}
function backToStore(){
    window.location.href = "store.html";
}