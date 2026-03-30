const API = window.location.hostname === "localhost"
  ? "http://localhost:3000"
  : "https://tcs-backend-oxa4.onrender.com";

let cart=[];
let allProducts = [];
let selectedProduct = null;

// ================= USER =================
const user = JSON.parse(localStorage.getItem('user'));

// حماية الصفحات
if(window.location.pathname.includes("store") && !user){
    location='index.html';
}

if(window.location.pathname.includes("dashboard")){
    if(!user || user.role !== "admin"){
        location='store.html';
    }
}

// ================= PASSWORD =================
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

        localStorage.setItem('user',JSON.stringify({
            ...data.user,
            role: data.user.role || "user"
        }));

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

            <img src="${API + p.image}">
            <h3>${p.name}</h3>
            <p>${p.price}$</p>

            <button onclick="event.stopPropagation(); addToCart('${p.name}',${p.price})">
                شراء
            </button>

            ${adminButtons}

        </div>`;
    });
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

// ================= PAGINATION =================
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

// ================= MODAL =================
function openProduct(p){
    selectedProduct = p;

    modalImage.src = API + p.image;
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
}

function removeFromCart(index){
    cart.splice(index,1);
    renderCart();
}

function clearCart(){
    cart = [];
    renderCart();
}

// ================= PAYPAL =================
function checkout(){

    if(cart.length === 0){
        alert("السلة فاضية");
        return;
    }

    document.getElementById('paypal-container').innerHTML = "";

    paypal.Buttons({
        createOrder: (data, actions)=>actions.order.create({
            purchase_units:[{
                amount:{
                    value: cart.reduce((a,b)=>a+b.price,0)
                }
            }]
        }),
        onApprove: async (data, actions)=>{
            await actions.order.capture();

            // 🔥 تسجيل الطلب
            await fetch(API+'/api/orders',{
                method:'POST',
                headers:{
                    'Content-Type':'application/json',
                    'Authorization':"Bearer " + localStorage.getItem('token')
                },
                body:JSON.stringify({
                    username: user.username,
                    price: cart.reduce((a,b)=>a+b.price,0)
                })
            });

            alert("تم الدفع");
            cart=[];
            renderCart();
        }
    }).render('#paypal-container');
}

// ================= ADMIN =================
async function addProduct(){

    const form=new FormData();

    form.append("name",pname.value);
    form.append("price",pprice.value);
    form.append("description",pdesc.value);
    form.append("image",pimg.files[0]);

    const res = await fetch(API+'/api/products',{
        method:'POST',
        headers:{
            'Authorization':"Bearer " + localStorage.getItem('token')
        },
        body:form
    });

    const data = await res.json();

    if(data.success){
        alert("تم الإضافة");
        loadProducts();
    }
}

async function deleteProduct(id){
    await fetch(API+'/api/products/'+id,{
        method:'DELETE',
        headers:{
            'Authorization':"Bearer " + localStorage.getItem('token')
        }
    });

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
            'Authorization':"Bearer " + localStorage.getItem('token')
        },
        body:JSON.stringify({
            name:newName,
            price:newPrice,
            description:newDesc
        })
    });

    loadProducts();
}

// ================= MENU =================
function toggleMenu(){
    const menu = document.getElementById('dropdownMenu');
    menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// ================= CART BUTTON =================
function toggleCart(){
    const cartBox = document.getElementById('cartItems');
    cartBox.style.display = cartBox.style.display === "block" ? "none" : "block";
}

// ================= LOGOUT =================
function logout(){
    localStorage.clear();
    location='index.html';
}

// ================= INIT =================
if(window.location.pathname.includes("store")){
    if(user){
        usernameBox.innerText=user.username;

        if(user.role==="admin"){
            document.getElementById('adminLink').style.display="block";
        }

        loadProducts();
    }
}