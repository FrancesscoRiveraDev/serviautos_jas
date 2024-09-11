// 1 - Invocamos a Express
const express = require('express');
const app = express();
const path = require('path');
const PDFDocument = require('pdfkit');
const moment = require('moment-timezone');
//2 - Para poder capturar los datos del formulario (sin urlencoded nos devuelve "undefined")
app.use(express.urlencoded({extended:false}));
app.use(express.json());//además le decimos a express que vamos a usar json

//3- Invocamos a dotenv
const dotenv = require('dotenv');
dotenv.config({ path: './env/.env'});

//4 -seteamos el directorio de assets
//app.use('/resources',express.static('public'));
//app.use('/resources', express.static(__dirname + '/public'));

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));



// Configura el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//5 - Establecemos el motor de plantillas
app.set('view engine','ejs');

//6 -Invocamos a bcrypt
const bcrypt = require('bcryptjs');

//7- variables de session
const session = require('express-session');
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));


////////////////////////////////////////////////////////////////////////////////////////////
//algunas vistas

//quienes somos
app.get('/cliente/quienessomos',(req, res)=>{
	res.render('cliente/quienessomos');
})

//servicios
app.get('/cliente/servicios',(req, res)=>{
	res.render('cliente/servicios');
})

//contactanos
app.get('/cliente/contactanos',(req, res)=>{
	res.render('cliente/contactanos');
})

//dashboard para admin
app.get('/admin/dashboard',(req, res)=>{
	res.render('admin/dashboard');
})

//dashboard para mecanicos
app.get('/admin/dashboard2',(req, res)=>{
	res.render('admin/dashboard2');
})




app.post('/guardarMensaje', (req, res) => {
    const { nombre, telefono, mensaje } = req.body;
  
    // Obtener la fecha actual en el formato MySQL
    const fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
  
    const contactanos = {
      nombre,
      telefono,
      mensaje,
      fecha,
      estado_idestado: 1, // El estado siempre es 1
    };
  
    const sql = 'INSERT INTO mensaje SET ?';
  
    conexion.query(sql, contactanos, (err, result) => {
      if (err) {
        console.error('Error al enviar el mensaje: ', err);
        return res.redirect('/?mensajeEnviado=false');  // Redirige con parámetro de error
      }
  
      console.log('Mensaje enviado correctamente');
      res.redirect('/?mensajeEnviado=true');  // Redirige con parámetro de éxito
    });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.post('/login', (req, res) => {
    const { user, password } = req.body;

    const sql = 'SELECT * FROM usuario WHERE user = ?';

    conexion.query(sql, [user], async (err, results) => {
        if (err) {
            console.error('Error al iniciar sesión: ', err);
            return res.status(500).send('Error en el servidor');
        }

        if (results.length > 0) {
            const user = results[0];

            // Verificar si el usuario está activo
            if (user.estado_usuario_idEstadoUsuario !== 1) {
                return res.redirect('/'); // Redirigir al índice si el usuario no está activo
            }

            // Verificar la contraseña
            const passwordMatch = await bcrypt.compare(password, user.password);

            if (passwordMatch) {
                const idUsuario = user.idUsuario;

                // Obtener la hora actual del servidor en la zona horaria correcta
                const fechaHoraInicio = moment().format('YYYY-MM-DD HH:mm:ss');

                // Insertar registro de inicio de sesión
                const sqlInsert = 'INSERT INTO registro_sesiones (usuario_idUsuario, fecha_hora_inicio) VALUES (?, ?)';
                conexion.query(sqlInsert, [idUsuario, fechaHoraInicio], (err, result) => {
                    if (err) {
                        console.error('Error al registrar la sesión: ', err);
                    }
                });

                // Redirigir según el rol del usuario
                if (user.rol_idRol === 1) {
                    res.redirect('/admin/dashboard');
                } else if (user.rol_idRol === 2) {
                    res.redirect('/admin/dashboard2');
                } else {
                    res.redirect('/'); // Redirigir a la página principal o a una página de error si el rol no es reconocido
                }
            } else {
                res.status(401).send('Usuario o contraseña incorrectos');
            }
        } else {
            res.status(401).send('Usuario o contraseña incorrectos');
        }
    });
});
//////////////////////////////////////////////////////////////////////////////////////////////
//para acciones de usuario

app.get('/admin/usuario', (req, res) => {     
    conexion.query('SELECT idUsuario, user, password, rol_idRol, estado_usuario_idEstadoUsuario FROM usuario', (error, results) => {
        if (error) {
            throw error;
        } else {  
            res.render('admin/usuario', { results: results }); 
        }   
    });
});


app.get('/admin/usuarioCreate',(req, res)=>{
    res.render('admin/usuarioCreate');
})


app.get('/admin/usuarioEdit/:idUsuario', (req, res) => {    
    const idUsuario = req.params.idUsuario;

    // Primero, selecciona los datos del usuario
    conexion.query('SELECT * FROM usuario WHERE idUsuario = ?', [idUsuario], (error, results) => {
        if (error) {
            throw error;
        } else {
            // Verifica si el usuario existe antes de hacer la segunda consulta
            if (results.length > 0) {
                const usuario = results[0];
                const idEmpleado = usuario.idUsuario; // Ajusta según el nombre del campo correcto si es diferente

                // Luego, selecciona los datos del empleado relacionado
                conexion.query('SELECT * FROM empleado WHERE idEmpleado = ?', [idEmpleado], (error, empleadoResults) => {
                    if (error) {
                        throw error;
                    } else {
                        // Renderiza la vista con los datos tanto del usuario como del empleado
                        res.render('admin/usuarioEdit', {
                            usuario: usuario,
                            empleado: empleadoResults[0] // Ajusta según lo que necesites mostrar
                        });
                    }
                });
            } else {
                res.status(404).send('Usuario no encontrado');
            }
        }
    });
});


////////////////////////////////////////////////////////////////////////////////////////////////////////
//dar de baja

app.get('/admin/usuarioDelete/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Obtener la fecha actual del sistema en formato YYYY-MM-DD
    const fechaDespido = moment().format('YYYY-MM-DD HH:mm:ss');
    // Actualizar el estado del usuario a 2 en la tabla usuario
    const updateUsuarioQuery = 'UPDATE usuario SET estado_usuario_idEstadoUsuario = 2 WHERE idUsuario = ?';
    
    conexion.query(updateUsuarioQuery, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error actualizando el estado del usuario.');
        }

        // Actualizar la fecha de despido en la tabla empleado
        const updateEmpleadoQuery = 'UPDATE empleado SET fechaDespido = ? WHERE idEmpleado = ?';
        
        conexion.query(updateEmpleadoQuery, [fechaDespido, idUsuario], (error, results) => {
            if (error) {
                console.log(error);
                return res.status(500).send('Error actualizando la fecha de despido del empleado.');
            }

            // Redirigir a la vista de usuario tras la actualización
            res.redirect('/admin/usuario');
        });
    });
});

/////////////////////////////////////////////////////////////////////////////////////////////////////
// para generar el reporte individual

// para generar el reporte individual

// Ruta para generar el reporte en PDF de un usuario individual
app.get('/admin/usuarioReporte/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Consulta para obtener los datos del usuario
    const queryUsuario = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.idUsuario = ?;
    `;

    conexion.query(queryUsuario, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos del usuario.');
        }

        if (results.length === 0) {
            return res.status(404).send('Usuario no encontrado.');
        }

        const usuario = results[0];

        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

       
        // Crear un documento PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_' + usuario.nombre +'_'+ usuario.apellido +'.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { align: 'center' ,  width: 100 }) // Ajusta las dimensiones y la posición según sea necesario
           .fontSize(20)
           .text('Serviautos Jas', { align: 'center' }) // Ajusta el nombre y la posición según sea necesario
           .moveDown();

        // Agregar título y detalles del usuario
        doc.fontSize(18).text('Reporte de Usuario', { align: 'center' });
        doc.moveDown();
        doc.moveDown();

        doc.fontSize(12).text(`ID Usuario: ${usuario.idUsuario}`);
        doc.text(`Usuario: ${usuario.user}`);

        // Mostrar "Activo" o "Inactivo" según el estado
        const estadoUsuario = usuario.estado_usuario_idEstadoUsuario === 1 ? 'Activo' : 'Inactivo';
        doc.text(`Estado Usuario: ${estadoUsuario}`);
        
        doc.moveDown();
        doc.fontSize(14).text('Datos del Empleado:', { underline: true });
        doc.fontSize(12).text(`DPI: ${usuario.dpi}`);
        doc.text(`Nombre: ${usuario.nombre}`);
        doc.text(`Apellido: ${usuario.apellido}`);
        doc.text(`Teléfono: ${usuario.telefono}`);
        doc.text(`Dirección: ${usuario.direccion}`);
        doc.text(`Puesto: ${usuario.puesto}`);
        doc.text(`Sueldo: Q. ${usuario.sueldo}`);
        doc.text(`Fecha de Contratación: ${formatFecha(usuario.fechaContratacion)}`);
        doc.text(`Fecha de Despido: ${formatFecha(usuario.fechaDespido) || 'Actualmente laborando'}`);

        // Finalizar el PDF
        doc.end();
    });
});


// Ruta para generar el reporte en PDF de todos los usuarios activos
app.get('/admin/usuarioReporteActivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 1;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los usuarios.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron usuarios activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_usuarios_activos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Usuarios Activos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 20;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});



// Ruta para generar el reporte en PDF de todos los usuarios inactivos
app.get('/admin/usuarioReporteInactivo', (req, res) => {

    // Consulta para obtener todos los usuarios activos
    const queryUsuariosActivos = `
        SELECT u.idUsuario, u.user, u.estado_usuario_idEstadoUsuario, e.dpi, e.nombre, e.apellido, e.telefono, e.direccion, e.puesto, e.sueldo, e.fechaContratacion, e.fechaDespido
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        WHERE u.estado_usuario_idEstadoUsuario = 2;
    `;

    conexion.query(queryUsuariosActivos, (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).send('Error al obtener los datos de los usuarios.');
        }

        if (results.length === 0) {
            return res.status(404).send('No se encontraron usuarios activos.');
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', 'attachment; filename=reporte_usuarios_inactivos.pdf');
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo
        
        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Usuarios Activos', { align: 'center' });
        doc.moveDown(2);

        // Función para formatear fechas a dd/mm/aaaa
        const formatFecha = (fecha) => {
            if (!fecha) return 'Actualmente laborando';
            const date = new Date(fecha);
            return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        };

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('ID Usuario', 50, 160, { width: 60, align: 'left' })
            .text('Usuario', 120, 160, { width: 80, align: 'left' })
            .text('DPI', 210, 160, { width: 80, align: 'left' })
            .text('Nombre', 300, 160, { width: 80, align: 'left' })
            .text('Apellido', 390, 160, { width: 80, align: 'left' })
            .text('Teléfono', 480, 160, { width: 80, align: 'left' })
            .moveTo(45, 175).lineTo(555, 175).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada usuario activo en la tabla
        let yPosition = 185;
        results.forEach(usuario => {
            doc.fontSize(10).fillColor('black')
                .text(usuario.idUsuario, 50, yPosition, { width: 60, align: 'left' })
                .text(usuario.user, 120, yPosition, { width: 80, align: 'left' })
                .text(usuario.dpi, 210, yPosition, { width: 80, align: 'left' })
                .text(usuario.nombre, 300, yPosition, { width: 80, align: 'left' })
                .text(usuario.apellido, 390, yPosition, { width: 80, align: 'left' })
                .text(usuario.telefono, 480, yPosition, { width: 80, align: 'left' });
            
            // Añadir una nueva línea por cada usuario
            yPosition += 20;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});


app.get('/admin/usuarioReporteSesiones/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    // Consulta para obtener los datos del usuario y sus inicios de sesión
    const queryUsuarioSesiones = `
        SELECT u.user, e.nombre, e.apellido, rs.fecha_hora_inicio
        FROM usuario u
        JOIN empleado e ON u.idUsuario = e.idEmpleado
        JOIN registro_sesiones rs ON u.idUsuario = rs.usuario_idUsuario
        WHERE u.idUsuario = ?;
    `;

    conexion.query(queryUsuarioSesiones, [idUsuario], (error, results) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ success: false, message: 'Error al obtener los datos de los inicios de sesión.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'No se encontraron registros de inicios de sesión para este usuario.' });
        }

        // Crear un documento PDF
        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Disposition', `attachment; filename=reporte_sesiones_usuario_${idUsuario}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        doc.pipe(res);

        // Ruta del logo de la empresa
        const logoPath = path.join(__dirname, '/public/img/logo.jpg'); // Ajusta esta ruta según la ubicación de tu logo

        // Agregar el logo y la información de la empresa
        doc.image(logoPath, { width: 80, align: 'center' })
            .fontSize(20)
            .text('Serviautos Jas', { align: 'center' })
            .moveDown();

        // Título del reporte
        doc.fontSize(18).text('Reporte de Inicios de Sesión del Usuario', { align: 'center' });
        doc.moveDown(2);

        // Mostrar detalles del usuario (solo una vez, ya que es el mismo para todas las sesiones)
        const usuario = results[0];
        doc.fontSize(12)
            .text(`Usuario: ${usuario.user}`, { align: 'left' })
            .text(`Nombre: ${usuario.nombre}`, { align: 'left' })
            .text(`Apellido: ${usuario.apellido}`, { align: 'left' })
            .moveDown(2);

        // Añadir encabezados de la tabla
        doc.fontSize(12).fillColor('black')
            .text('Fecha y Hora de Inicio de Sesión', 100, 180, { width: 400, align: 'center' })
            .moveTo(45, 195).lineTo(555, 195).stroke(); // Línea bajo los encabezados

        // Añadir los datos de cada inicio de sesión
        let yPosition = 210;
        results.forEach(sesion => {
            doc.fontSize(10).fillColor('black')
                .text(sesion.fecha_hora_inicio, 100, yPosition, { width: 400, align: 'center' });
            
            // Añadir una nueva línea por cada inicio de sesión
            yPosition += 20;

            // Si la posición Y es mayor a 720, crear una nueva página
            if (yPosition > 720) {
                doc.addPage();
                yPosition = 50;
            }
        });

        // Finalizar el PDF
        doc.end();
    });
});




const usuarioCrud = require('./views/admin/controllers/usuarioCrud');
app.post('/saveUsuario', usuarioCrud.saveUsuario);
app.post('/updateUsuario', usuarioCrud.updateUsuario);
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///empleado

app.get('/admin/empleado', (req, res) => {     
    conexion.query('SELECT idEmpleado, nombre, apellido, telefono, puesto FROM empleado', (error, results) => {
        if (error) {
            throw error;
        } else {  
            res.render('admin/empleado', { results: results }); 
        }   
    });
});



////////////////////////////////////////////////////////////////////////////////////////////
// 8 - Invocamos a la conexion de la DB
const conexion = require('./database/db');

//9 - establecemos las rutas
	app.get('/admin/login',(req, res)=>{
		res.render('admin/login');
	})

	app.get('/admin/register',(req, res)=>{
		res.render('admin/register');
	})

//10 - Método para la REGISTRACIÓN



// Supongamos que este es el proceso de registro de un usuario
app.post('/register', async (req, res) => {
    const { user, password, rol_idRol } = req.body;

    // Encriptar la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
        user,
        password: hashedPassword,
        rol_idRol
    };

    const sql = 'INSERT INTO usuario SET ?';

    conexion.query(sql, newUser, (err, result) => {
        if (err) {
            console.error('Error al registrar el usuario: ', err);
            return res.status(500).send('Error al registrar el usuario');
        }

        res.redirect('/login');
    });
});



//11 - Metodo para la autenticacion
app.post('/auth', async (req, res)=> {
	const user = req.body.user;
	const pass = req.body.pass;    
    let passwordHash = await bcrypt.hash(pass, 8);
	if (user && pass) {
		conexion.query('SELECT * FROM users WHERE user = ?', [user], async (error, results, fields)=> {
			if( results.length == 0 || !(await bcrypt.compare(pass, results[0].pass)) ) {    
				res.render('login', {
                        alert: true,
                        alertTitle: "Error",
                        alertMessage: "USUARIO y/o PASSWORD incorrectas",
                        alertIcon:'error',
                        showConfirmButton: true,
                        timer: false,
                        ruta: 'login'    
                    });
				
				//Mensaje simple y poco vistoso
                //res.send('Incorrect Username and/or Password!');				
			} else {         
				//creamos una var de session y le asignamos true si INICIO SESSION       
				req.session.loggedin = true;                
				req.session.name = results[0].name;
				res.render('login', {
					alert: true,
					alertTitle: "Conexión exitosa",
					alertMessage: "¡LOGIN CORRECTO!",
					alertIcon:'success',
					showConfirmButton: false,
					timer: 1500,
					ruta: ''
				});        			
			}			
			res.end();
		});
	} else {	
		res.send('Please enter user and Password!');
		res.end();
	}
});

//12 - Método para controlar que está auth en todas las páginas
// Middleware para verificar si el usuario está autenticado
function isAuthenticated(req, res, next) {
    if (req.session.loggedin) {
        next(); // Si está autenticado, pasa al siguiente middleware o ruta
    } else {
        res.render('index', { // Redirige al inicio de sesión si no está autenticado
            login: false,
            name: 'Debe iniciar sesión'
        });
    }
}
// Ruta para la página principal
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            login: true,
            name: req.session.name
        });
    } else {
        res.render('index', {
            login: false,
            name: 'Debe iniciar sesión'
        });
    }
    res.end();
});

// Rutas protegidas con autenticación
app.get('/admin/dashboard', isAuthenticated, (req, res) => {
    res.render('admin/dashboard', {
        login: true,
        name: req.session.name
    });
});

app.get('/admin/usuario', isAuthenticated, (req, res) => {     
    conexion.query('SELECT idUsuario, user, password, rol_idRol FROM usuario', (error, results) => {
        if (error) {
            throw error;
        } else {  
            res.render('admin/usuario', { results: results, login: true, name: req.session.name }); 
        }   
    });
});


// Middleware para limpiar la caché después del logout
app.use((req, res, next) => {
    if (!req.session.loggedin) {  
        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
    }
    next();
});

// Ruta para cerrar sesión
app.get('/admin/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al destruir la sesión: ', err);
            return res.status(500).send('Error al cerrar sesión.');
        }
        // Redirige a la página principal o de inicio de sesión
        res.clearCookie('connect.sid', { path: '/' }); // Opcional: limpia la cookie de sesión
        res.redirect('/');  // Asegúrate de que '/' apunte al index
    });
});



app.listen(3000, (req, res)=>{
    console.log('SERVER RUNNING IN http://localhost:3000');
});