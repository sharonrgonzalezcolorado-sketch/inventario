const USE_BACKEND = false;
const API_URL = 'api_productos.php';

// Base de datos simulada en localStorage

let productos = JSON.parse(localStorage.getItem('inventario_productos')) || [
    {
        id: 1,
        codigo_barras: '1234567890123',
        nombre: 'Laptop HP Pavilion',
        categoria: 'Electrónicos',
        descripcion: 'Laptop HP Pavilion 15" con 8GB RAM',
        stock: 10,
        precio: 599.99,
        stock_minimo: 2
    },
    {
        id: 2,
        codigo_barras: '2345678901234',
        nombre: 'Camiseta Básica',
        categoria: 'Ropa',
        descripcion: 'Camiseta 100% algodón',
        stock: 50,
        precio: 19.99,
        stock_minimo: 10
    },
    {
        id: 3,
        codigo_barras: '3456789012345',
        nombre: 'Silla de Oficina',
        categoria: 'Hogar',
        descripcion: 'Silla ergonómica para oficina',
        stock: 8,
        precio: 149.99,
        stock_minimo: 3
    }
];

let proximoId = Math.max(...productos.map(p => p.id), 0) + 1;
let html5QrCode = null;
let html5QrCodeModal = null;
let scannerActivo = false;
let scannerIniciando = false;
let scannerProcesando = false;
let scannerAccion = null;

/*--------------------------------
    Funciones para usar el backend
---------------------------------*/

// Funciones de navegación
function mostrarTab(tabName){
    //Ocultar todos los contenidos
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Mostrar el contenido seleccionado
    document.getElementById(`content-${tabName}`).classList.add('active');

    // Actualizar estilos de pestañas
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'scanner') {
        iniciarScanner();
    } else if (scannerActivo) {
        detenerScanner();
    }

    // Cargar datos si es necesario 
    if(tabName === 'productos'){
        cargarProductos();
    }
}

// Funciones de productos
function cargarProductos(){
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '';

    //Datos del servidor




    // localStorage
    productos.forEach(producto => {
        const fila = document.createElement('tr');

        const stockClass = producto.stock <= producto.stock_minimo ? 'stock-low' : '';

        fila.innerHTML = `
            <td>${producto.id}</td>
            <td style = "font-family: monospace;">${producto.codigo_barras || 'N/A'}</td>
            <td>${producto.nombre}</td>
            <td>${producto.categoria}</td>
            <td class= "${stockClass}">${producto.stock}</td>
            <td>${producto.precio.toFixed(2)}</td>
            <td>
                <button onclick="editarProducto(${producto.id})" class="btn btn-primary" style="margin-right: 5px; padding: 5px 10px;">
                    &#x1F4DD;
                    Editar
                </button>
                <button onclick="eliminarProducto(${producto.id})" class="btn btn-danger" style="padding: 5px 10px;">
                    &#x274C;
                    Eliminar
                </button>
            </td>
        `;
        tbody.appendChild(fila);
    });
    actualizarEstadisticas();
}

function actualizarEstadisticas(){
    const totalProductos = productos.length;
    const valorTotal = productos.reduce((total, producto) => total + (producto.stock * producto.precio), 0);

    document.getElementById('totalProductos').textContent = totalProductos;
    document.getElementById('valorTotal').textContent = valorTotal.toFixed(2);
}

// Formulario de productos
document.getElementById('formProducto').addEventListener('submit', function(e){
    e.preventDefault();

    //Simulación local
    const nuevoProducto = {
        id: proximoId++,
        codigo_barras: document.getElementById('codigoBarras').value,
        nombre: document.getElementById('nombreProducto').value,
        categoria: document.getElementById('categoriaProducto').value,
        descripcion: document.getElementById('descripcionProducto').value,
        stock: parseInt(document.getElementById('stockProducto').value, 10),
        precio: parseFloat(document.getElementById('precioProducto').value),
        stock_minimo: parseInt(document.getElementById('stockMinimo').value)

    };

    //Verificar si el código de barras ya existe
    if(nuevoProducto.codigo_barras && productos.some(p => p.codigo_barras === nuevoProducto.codigo_barras)){
        mostrarNotificacion('El código de barras ya existe', 'error');
        return;
    }

    //Enviar al servidor


    //Guardar localmente
    productos.push(nuevoProducto);
    guardarEnLocalStorage();
    mostrarNotificacion('Producto agregado correctamente', 'success');
    limpiarFormulario();
    mostrarTab('productos');
});

function limpiarFormulario(){
    document.getElementById('formProducto').reset();
    document.getElementById('stockMinimo').value = 5;
}

function buscarProductos(){
    const termino = document.getElementById('buscarProducto').value.toLowerCase();
    const filas = document.querySelectorAll('#tablaProductos tr');

    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        if (texto.includes(termino)){
            fila.style.display = '';
        }else{
            fila.style.display = 'none';
        }
    });
}

function buscarProductoPorCodigo(){
    const codigo = document.getElementById('codigoEscaneado').textContent;
    const producto = productos.find(p => p.codigo_barras === codigo);

    if(producto){
        mostrarTab('productos');
        document.getElementById('buscarProducto').value = codigo;
        buscarProductos();
        mostrarNotificacion('Producto encontrado', 'success');
    }else{
        mostrarNotificacion('producto no encontrado. ¿Deseas agregarlo?', 'error');
        document.getElementById('codigoBarras').value = codigo;
        mostrarTab('agregar');
    }
}

function abrirScannerRapido(){
    scannerAccion = 'formulario';
    document.getElementById('resultadoScan').classList.remove('show');
    mostrarTab('scanner');
}

function usarCodigoEscaneado(){
    const codigo = document.getElementById('codigoEscaneado').textContent.trim();
    if (!codigo) {
        mostrarNotificacion('Primero escanea un código de barras', 'error');
        return;
    }

    document.getElementById('codigoBarras').value = codigo;
    mostrarTab('agregar');
    mostrarNotificacion('Código agregado al formulario', 'success');
}

function editarProducto(id){
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    document.getElementById('editarId').value = producto.id;
    document.getElementById('editarNombre').value = producto.nombre;
    document.getElementById('editarStock').value = producto.stock;
    document.getElementById('editarPrecio').value = producto.precio;

    document.getElementById('modalEditar').classList.add('show');
}

function cerrarModal(){
    document.getElementById('modalEditar').classList.remove('show');
}

//Backend

// Funciones del scanner
async function iniciarScanner(){
    if (scannerActivo || scannerIniciando) return;
    if (typeof Html5Qrcode === 'undefined' || typeof Html5QrcodeSupportedFormats === 'undefined') {
        mostrarNotificacion('No se pudo cargar el lector. Verifica tu conexión a internet.', 'error');
        return;
    }

    scannerIniciando = true;
    scannerProcesando = false;
    document.getElementById('btnIniciarScanner').disabled = true;
    html5QrCode = new Html5Qrcode('reader');

    const config = {
        fps: 10,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.min(300, Math.floor(viewfinderWidth * 0.9)),
            height: Math.min(150, Math.floor(viewfinderHeight * 0.4))
        }),
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE
        ]
    };

    try {
        await html5QrCode.start(
            {facingMode: 'environment'},
            config,
            async decodedText => {
                if (scannerProcesando) return;
                scannerProcesando = true;
                document.getElementById('codigoEscaneado').textContent = decodedText;
                document.getElementById('resultadoScan').classList.add('show');
                await detenerScanner();
                mostrarNotificacion('Código escaneado correctamente', 'success');

                if (scannerAccion === 'formulario') {
                    scannerAccion = null;
                    document.getElementById('codigoBarras').value = decodedText;
                    mostrarTab('agregar');
                    mostrarNotificacion('Código agregado al formulario', 'success');
                }
            },
            () => {}
        );
        scannerActivo = true;
        document.getElementById('btnIniciarScanner').style.display = 'none';
        document.getElementById('btnDetenerScanner').style.display = 'inline-block';
        if (!document.getElementById('content-scanner').classList.contains('active')) {
            await detenerScanner();
        }
    } catch (error) {
        html5QrCode = null;
        scannerAccion = null;
        mostrarNotificacion('No se pudo iniciar la cámara. Verifica los permisos y abre la página con HTTPS o localhost.', 'error');
    } finally {
        scannerIniciando = false;
        document.getElementById('btnIniciarScanner').disabled = false;
    }
}

async function detenerScanner(){
    if (html5QrCode && scannerActivo) {
        const lector = html5QrCode;
        scannerActivo = false;
        try {
            await lector.stop();
            lector.clear();
            html5QrCode = null;
        } catch (error) {
            mostrarNotificacion('No se pudo detener la cámara correctamente.', 'error');
        }
    }
    document.getElementById('btnIniciarScanner').style.display = 'inline-block';
    document.getElementById('btnDetenerScanner').style.display = 'none';
}

function guardarEnLocalStorage(){
    localStorage.setItem('inventario_productos', JSON.stringify(productos));
}

function mostrarNotificacion(mensaje, tipo){
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification-${tipo}`;
    notificacion.textContent = mensaje;
    notificacion.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    notificacion.setAttribute('aria-live', tipo === 'error' ? 'assertive' : 'polite');
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 4000);
}

//Inicialización
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
});





