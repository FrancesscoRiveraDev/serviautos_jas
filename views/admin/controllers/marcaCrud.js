const conexion = require('../../../database/db');



//GUARDAR un REGISTRO
exports.saveMarca = (req, res)=>{
    const nombre = req.body.nombre;
    
    conexion.query('INSERT INTO marca SET ?',{nombre:nombre}, (error, results)=>{
        if(error){
            console.log(error);
        }else{
            //console.log(results);   
            res.redirect('/admin/marca');         
        }
});
};


//ACTUALIZAR un REGISTRO
exports.updateMarca = (req, res)=>{
    const idMarca = req.body.idMarca;
    const nombre = req.body.nombre;
    
    conexion.query('UPDATE marca SET ? WHERE idMarca = ?',[{nombre:nombre}, idMarca], (error, results)=>{
        if(error){
            console.log(error);
        }else{           
            res.redirect('/admin/marca');         
        }
});
};