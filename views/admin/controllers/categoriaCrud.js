const conexion = require('../../../database/db');



//GUARDAR un REGISTRO
exports.saveCategoria = (req, res)=>{
    const nombre = req.body.nombre;
    const descripcion = req.body.descripcion;
    conexion.query('INSERT INTO categoria SET ?',{nombre:nombre, descripcion:descripcion}, (error, results)=>{
        if(error){
            console.log(error);
        }else{
            //console.log(results);   
            res.redirect('/admin/categoria');         
        }
});
};


//ACTUALIZAR un REGISTRO
exports.updateCategoria = (req, res)=>{
    const idCategoria = req.body.idCategoria;
    const nombre = req.body.nombre;
    const descripcion = req.body.descripcion;
    conexion.query('UPDATE categoria SET ? WHERE idCategoria = ?',[{nombre:nombre, descripcion:descripcion}, idCategoria], (error, results)=>{
        if(error){
            console.log(error);
        }else{           
            res.redirect('/admin/categoria');         
        }
});
};