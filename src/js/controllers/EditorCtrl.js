var app = angular.module('app');

app.controller('EditorCtrl', function($scope, Canvas, $location, Menu, MisArchivos) {

  $scope.borrar_elemento_seleccionado = function() {
    Canvas.borrar_elemento_seleccionado();
  }

  $scope.espejar_elemento_seleccionado = function() {
    Canvas.espejar_elemento_seleccionado();
  }

  $scope.subir_elemento_seleccionado = function() {
    Canvas.subir_elemento_seleccionado();
  }

  $scope.bajar_elemento_seleccionado = function() {
    Canvas.bajar_elemento_seleccionado();
  }

  $scope.deshacer = function() {
      Canvas.deshacer();
      $scope.botones_undo();
  }

  $scope.rehacer = function() {
      Canvas.rehacer();
      $scope.botones_undo();
  }

  $scope.botones_undo = function(){
    $scope.data.puede_deshacer = ! (Canvas.estado_pila().pos <= 1);
    $scope.data.puede_rehacer = ! (Canvas.estado_pila().pos == Canvas.estado_pila().len-1);
    //console.log('estado pila', Canvas.estado_pila() );
  }

  var path = 'partes/';

  $scope.data = {};
  $scope.data.guardando = false;
  $scope.data.directorios = [];
  $scope.data.hay_elemento_seleccionado = false;
  $scope.data.puede_deshacer = true;
  $scope.data.puede_rehacer = false;

  Menu.habilitar_items_menu();

  Canvas.conectar_eventos(function(estado) {
    $scope.data.hay_elemento_seleccionado = estado;
    $scope.botones_undo();

    if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
      $scope.$apply();
    }
  });


  $scope.abrir_directorio = function(dir) {
    var gui = require('nw.gui');
    gui.Shell.showItemInFolder('./');
  }

  $scope.agregar_nuevo_item = function(dir) {
    var path = require('path');
    var gui = require('nw.gui');
    var partes_path = './src/partes/' + dir.titulo;

    setTimeout(function() {
        abrir_dialogo('#agregar_nuevo_item', function(origen) {
            origen = origen.replace('file://','');
            var partes_path = path.join(path.resolve('./partes/'),
                                        dir.titulo);

            var destino = path.join(partes_path, path.basename(origen));
            fs.writeFileSync(destino, fs.readFileSync(origen));
            actualizar_listado_directorios(function(){
                $scope.data.directorios
                    .map(function(solapa){
                        solapa.active = solapa.titulo == dir.titulo;
                    });
            });
        });
    }, 1);
  }

  $scope.selecciona_objeto = function(obj, dir) {
    var preferencias = {};

    preferencias.es_fondo = dir.preferencias.es_fondo || false;
    preferencias.x = dir.preferencias.x || 0;
    preferencias.y = dir.preferencias.y || 0;
    preferencias.z = dir.preferencias.z || 0;
    preferencias.ancho = dir.preferencias.ancho || 50;
    preferencias.alto = dir.preferencias.alto || 50;
    preferencias.doble = dir.preferencias.doble || false;
    preferencias.admite_duplicados = dir.preferencias.admite_duplicados || false;
    preferencias.distancia_entre_dobles = dir.preferencias.distancia_entre_dobles || 100;

    if (preferencias.es_fondo)
      Canvas.definir_fondo(obj.src, preferencias);
    else
      Canvas.agregar_imagen(obj.src, preferencias);


    $scope.botones_undo();
  }

  /*
  * Se invoca cuando se quiere leer un directorio de la galería (un tab
  * de la aplicación como 'cara', 'nariz' etc...)
  */
  function actualizar_galeria(ruta_directorio, objeto_directorio) {
    var titulo = objeto_directorio.titulo;
    var indice = -1;

    // Cuando se actualiza una galeria, ya existe un listado de todos
    // los directorios de galerias, así que en esta parte de procede
    // a buscar el índice de la galería dentro de esa lista previsamente
    // realizada.
    for (var i=0; i<$scope.data.directorios.length; i++) {
      if ($scope.data.directorios[i].titulo === titulo) {
        indice = i;
      }
    }

    // Ahora se lee el directorio en busca de archivos svg, para actualizar
    // la galeria.
    //
    // Como caso particular, si se encuentra un archivo llamado configuración
    // "preferencias.json", se lee para que sea el que define las preferencias
    // iniciales para cada objeto de la colección.
    fs.readdir(ruta_directorio, function(error, data) {
      $scope.data.directorios[indice].objetos = [];

      if (!data)
      return;

      for (var i=0; i<data.length; i++) {
        var ruta = data[i];

        if (/\.svg$/.test(ruta) || /\.jpg$/.test(ruta)) {
          var item = {src: ruta_directorio + '/' + ruta};
          $scope.data.directorios[indice].objetos.push(item);
        }

        if (/^preferencias.json$/.test(ruta)) {
          var preferencias = require("./" + ruta_directorio + "/" + ruta);
          $scope.data.directorios[indice].preferencias = preferencias;
          $scope.data.directorios[indice].tiene_preferencias = true;
        }

      }

      $scope.$apply();
    });

    //console.log(indice, ruta_directorio);
    //objeto_directorio.objetos.push({src: "partes/pelo/nariz_1.svg"});
  }

  /**
  * Se invoca para leer todos los directorios de la galería y volver
  * a generar los tabs de la aplicación.
  *
  * Este método se llama cada vez que se inicia la aplicación o se
  * produce un cambio en los directorios de galería.
  */
  function actualizar_listado_directorios(cb) {

    fs.readdir(path, function(error, data) {
      $scope.data.directorios = [];

      // Por cada directorio en  "./partes" ...
      for (var i=0; i<data.length; i++) {
        var titulo = data[i];
        var objeto_directorio = {titulo: titulo, tiene_preferencias: false, preferencias: {}, active: false, objetos: []}

        if (/^\./.test(titulo)) // ignora los directorios y archivos ocultos.
        continue;

        $scope.data.directorios.push(objeto_directorio);
        actualizar_galeria(path + titulo, objeto_directorio);
      }

      if( cb ){ cb.call(this); }
      $scope.$apply();
    });
  }

  // Solicita cargar todos los directorios para generar la
  // galeria.
  actualizar_listado_directorios();


  function abrir_dialogo(name, funcion) {
    var chooser = document.querySelector(name);

    function on_click(evt) {
      funcion.call(this, this.value);
      chooser.removeEventListener("change", on_click)
    }

    chooser.addEventListener("change", on_click, false);
    chooser.click();
  }

  // $scope.guargar_png = function() {
  //   setTimeout(function() {
  //     abrir_dialogo('#guardar_png', function(ruta) {
  //       Canvas.guardar_como_archivo_png(ruta);
  //     });
  //   }, 1);
  // }

  $scope.guargar_png = function() {
    window.fn_guardar_png();
  }

  window.fn_guardar_png = function(){
    setTimeout(function() {
      abrir_dialogo('#guardar_png', function(ruta) {
        Canvas.guardar_como_archivo_png(ruta);
      });
    }, 1);
  }

  $scope.guardar_svg = function() {
    window.fn_guardar_svg();
  }

  window.fn_guardar_svg = function() {
    setTimeout(function() {
      abrir_dialogo('#guardar_svg', function(ruta) {
        Canvas.guardar_como_archivo_svg(ruta);
      });
    }, 1);
  }


  $scope.definir_como_mi_avatar = function() {
    window.fn_definir_como_mi_avatar();
  }

  window.fn_definir_como_mi_avatar = function(){
    var ruta_avatar = process.env.HOME + '/.face';
    var ruta_avatar_symlink = process.env.HOME + '/.huayra-compartir_avatar';

    Canvas.guardar_como_archivo_png(ruta_avatar);
    fs.unlink(ruta_avatar_symlink, function(){
      fs.symlinkSync(ruta_avatar, ruta_avatar_symlink, 'file');
    });
  }


  $scope.guardar_y_regresar = function() {
    window.fn_guardar_y_regresar();
  }

  window.fn_guardar_y_regresar = function() {
    var nombre = MisArchivos.obtener_numero().toString();
    $scope.data.guardando = true;

    Canvas.guardar(nombre, function() {
      MisArchivos.actualizar();

      setTimeout(function() {
        $location.path('/selector');
        $scope.$apply();
        Menu.deshabilitar_items_menu();
      }, 100);
    });
  }

  $scope.salir = function() {
    window.fn_salir();
  }

  window.fn_salir = function(){
    $location.path('/selector');
    Menu.deshabilitar_items_menu();
  }


  /* Carga el avatar sugerido por la URL: */
  var ruta = $location.search().ruta;
    Canvas.inicio();

  if (ruta) {
    Canvas.cargar(ruta);
  }

});
