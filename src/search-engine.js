/**
 * Motor de búsqueda semántica del catálogo.
 *
 * Portado del HTML original sin cambios de lógica: entiende sinónimos
 * ("nena" -> muñecas), subcategorías, intención de precio ("barato",
 * "menos de 10 mil") y tolera errores de tipeo.
 *
 * Generado por scripts/_port-search.js — se puede editar a mano desde acá.
 *
 * SYNONYMS y TAXONOMY actualizados el 18/8/2026 fusionando con una
 * versión más nueva del generador original (13 sinónimos y 7 subcategorías
 * nuevas: kpop, manicura, pista, aire libre, robot, afeitar, rastreador,
 * impresora, animales adicionales, camaras, bebés, etc.) — unión con lo
 * que ya había acá, sin perder nada (ver "capibara"/"capybara" en animal,
 * que sólo estaban de este lado). canonicalFuzzy() (tolerancia a errores
 * de tipeo al mapear sinónimos) es propio de este archivo, no del HTML
 * original — se mantiene.
 */

/* ---------- 1. Normalización ---------- */
const norm = s => (s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // saca tildes; ñ -> n
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const stem = w => {                                    // singular/plural
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s'))  return w.slice(0, -1);
  return w;
};
const toks  = s => norm(s).split(' ').filter(Boolean);
const stems = s => toks(s).map(stem);
const key   = s => stems(s).join(' ');                 // clave canónica

const STOPWORDS = new Set(['para','de','del','el','la','los','las','un','una','unos','unas',
  'y','o','con','sin','al','en','que','mi','tu','su','algo','cosa','cosas','busco','quiero',
  'necesito','me','lo','tipo','sobre','por','es','son','hay','tener','tienen','tenes','mas',
  'muy','bien','poco','alguna','algun','hacer','usar','poner','dar','comprar','ver','tener']);

/* ---------- 2. Diccionario central de sinónimos ----------
   canónico: [variantes que puede escribir la persona]
   Se usa tanto para expandir la consulta como para no tener que
   repetir sinónimos producto por producto.                        */
const SYNONYMS = {
  juguete:        ['juguete','juguetes','juguetito','jugueteria','jugar','juego','juegos','juguetes infantiles'],
  infantil:       ['infantil','chico','chicos','chicas','nene','nena','nenes','nenas','nino','ninos','nina','ninas','pequeno','peque','criatura','kids','hijo','hija'],
  nena:           ['nena','nenas','nina','ninas','chica','chicas','hija','femenino','princesa'],
  nene:           ['nene','nenes','nino','ninos','varon','varones','masculino'],
  muneca:         ['muneca','munecas','munequita','bebote','bebota','doll','barbie','bebe','bebes'],
  peluche:        ['peluche','peluches','felpa','suave','abrazable','abrazar','mimoso'],
  auto:           ['auto','autos','autito','autitos','coche','carro','camion','camiones','camioneta','vehiculo','rodado'],
  'control remoto': ['control remoto','radiocontrol','teledirigido','rc','a control'],
  volador:        ['avion','aviones','avioncito','volar','vuela','volador','voladora','helicoptero','planeador','drone','dron','ovni','ufo'],
  acuatico:       ['barco','barcos','lancha','lanchita','bote','velero','nautico','pileta','pileton','banera','agua'],
  'juego de mesa': ['juego de mesa','mesa','carta','cartas','naipe','naipes','mazo','poker','truco','dado','dados'],
  didactico:      ['didactico','educativo','aprender','logica','ingenio','armar','construccion','rompecabeza','rompecabezas','puzzle','encastre','stem','bloque','bloques','ladrillo','ladrillos','encastrable','encastrables','didacticos'],
  tecnologia:     ['tecnologia','tecnologico','tecnologicos','electronica','electronico','gadget','gadgets','dispositivo','aparato','electro'],
  celular:        ['celular','celu','telefono','movil','smartphone','cel','compu','computadora','notebook','pc','laptop','tablet','tableta','soporte para telefono','holder','portatil'],
  cargador:       ['cargador','cargadores','cargar','cable','cables','adaptador','fuente','usb','usb c','tipo c','carga rapida','pd','enchufe'],
  // "casco"/"cascos" sale de acá: en criollo casi siempre es casco de
  // moto/bici, no auricular — dejarlo como sinónimo de auriculares es
  // exactamente el tipo de relación amplia que cruza cosas que no
  // deberían tocarse (hoy no hay ningún casco de moto cargado, pero el
  // día que se cargue uno, con esto ya no se confunde con auriculares).
  auriculares:    ['auricular','auriculares','auris','audifono','audifonos','parlantes','bafle'],
  audio:          ['audio','sonido','musica','musical','escuchar musica','escuchar','microfono','micro','karaoke','parlante'],
  grabar:         ['grabar','grabacion','filmar','camara','video','videos','registrar','filmadora','action cam','camara deportiva','sumergible','casco'],
  'crear contenido': ['crear contenido','contenido','reels','reel','tiktok','youtube','streaming','creador'],
  luz:            ['luz','luces','linterna','lampara','velador','iluminacion','iluminar','led','proyector','luminoso','luminosa'],
  decoracion:     ['decoracion','decorar','decorativo','ambiente','deco','adorno'],
  masaje:         ['masaje','masajes','masajeador','relax','relajar','bienestar','muscular','contractura','spa','descontracturar'],
  belleza:        ['belleza','cuidado personal','piel','cutis','estetica','maquillaje','maquillar','maquillarse','tocador'],
  pelo:           ['pelo','cabello','peinado','peinar','planchita','plancha','alisador','rizado','ondas','peluqueria','secador'],
  salud:          ['salud','medico','respiratorio','embarazo','embarazada','latido','maternidad','apnea','bruxismo','descanso'],
  hogar:          ['hogar','casa','domestico','living','depto','departamento','del hogar'],
  habitacion:     ['habitacion','pieza','cuarto','dormitorio','pieza de los chicos'],
  // "cafe" y "cafetera" NO van acá — antes compartían este mismo canónico
  // con "mate"/"desayuno"/"receta"/"hornear"/"pesar"/etc., así que buscar
  // "café" traía toda la cocina (balanzas, utensilios, recetario) en vez
  // de sólo cafeteras. Tienen su propio grupo (ver "cafe" más abajo).
  cocina:         ['cocina','cocinar','mate','desayuno','comida','receta','recetas','reposteria','hornear','pesar','utensilio','utensilios','al vapor'],
  cafe:           ['cafe','cafes','cafetera','cafeteras','coffee','coffee maker','moka','espresso','capuchino','cappuccino','barista'],
  limpieza:       ['limpieza','limpiar','basura','residuo','residuos','higiene','pelusa'],
  organizar:      ['organizar','organizacion','organizador','orden','ordenar','guardar','almacenamiento','almacenar'],
  escuela:        ['escuela','colegio','cole','escolar','util','utiles','estudio','estudiar','clase','clases','tarea','universidad','facultad','libreria','papeleria','vuelta al cole'],
  escritura:      ['escribir','escritura','anotar','lapiz','lapices','lapicera','birome','marcador','marcadores','fibra','fibras','goma','borrar'],
  dibujo:         ['dibujar','dibujo','pintar','pintura','arte','artistico','manualidad','manualidades','creatividad','crear'],
  oficina:        ['oficina','trabajo','escritorio','home office'],
  regalo:         ['regalo','regalos','regalar','obsequio','sorpresa','detalle','souvenir'],
  cumpleanos:     ['cumpleanos','cumple','aniversario'],
  navidad:        ['navidad','reyes','fin de ano','papa noel'],
  'dia del nino': ['dia del nino','dia del ninos'],
  gaming:         ['gaming','gamer','consola','videojuego','videojuegos','retro','joystick','tv','televisor','smart tv','pantalla'],
  // "moto" NO va acá: compartía canónico con "bici"/"viaje"/"ruta", así
  // que traía luces de bicicleta, cámaras deportivas e infladores sólo
  // por asociación amplia — sin ningún producto para moto de verdad en
  // el catálogo, esa asociación no suma, sólo mete ruido. Si el nombre
  // de un producto dice literalmente "moto" (ej. un juguete), lo
  // encuentra igual por coincidencia directa de nombre, sin necesitar
  // estar acá.
  'accesorio auto': ['accesorio auto','automovil','ruta','viaje','taller','bici','bicicleta','neumatico','rueda'],
  animal:         ['animal','animales','perro','perrito','gato','dinosaurio','dinosaurios','dino','dinos','bicho','bichos','mascota','mascotas','animalito','animalitos','capibara','capybara'],
  coleccion:      ['coleccion','coleccionable','figura','funko','coleccionar'],
  ropa:           ['ropa','gorra','gorras','vestir','accesorio personal','moda'],
  entretener:     ['entretener','divertir','diversion','pasar el rato','aburrido','aburrimiento'],
  modelar:        ['modelar','masa','masas','masilla','masilina','plastilina','moldear','arcilla','amasar','sello','sellos'],
  antiestres:     ['antiestres','pop it','popit','fidget','sensorial','apretar','burbuja','burbujas','reflejos','destreza','concentrarse'],
  ingles:         ['ingles','english','idioma','bilingue','vocabulario','flash card','flash cards','tarjetas parlantes','primeras palabras'],
  cuna:           ['cuna','cunita','recien nacido','baby shower','maternidad','sonajero','movil de cuna','primeros meses'],
  dormir:         ['dormir','sueno','descansar','siesta','noche','nocturna','nocturno','calmar','luz de noche','acostarse'],
  kpop:           ['kpop','k pop','idol','escenario','musica coreana'],
  manicura:       ['manicura','unas','nail art','esmalte','unia','unias'],
  pista:          ['pista','pistas','circuito','looping','rampa','autopista de juguete'],
  aire_libre:     ['aire libre','patio','jardin','vereda','plaza','camping','verano','vacaciones','playa'],
  robot:          ['robot','robots','robotica','transformable','transformer','mecha','armable'],
  afeitar:        ['afeitadora','afeitar','afeitado','maquina de afeitar','rasuradora','recortadora','trimmer','barba','bigote','patillas'],
  rastreador:     ['rastreador','localizador','smart tag','airtag','gps','encontrar','perdido','llaves','find my'],
  impresora:      ['impresora','imprimir','impresion','termica','sticker','stickers','etiqueta','etiquetas','apuntes']
};

// Índice invertido: variante (clave canónica) -> término canónico
const SYN = new Map();
for (const canon in SYNONYMS) {
  SYN.set(key(canon), canon);
  SYNONYMS[canon].forEach(v => { if (!SYN.has(key(v))) SYN.set(key(v), canon); });
}
const canonical = t => SYN.get(t) || t;

/* Igual que canonical(), pero si el término no está en el diccionario prueba
   con distancia de edición contra las claves conocidas. Así "jugete",
   "masajedor" o "linterna" mal tipeados siguen encontrando su categoría.
   Sólo se usa al consultar (nunca al indexar) y va memoizado, porque
   scoreToken lo llama una vez por producto y por token. */
const SYN_KEYS = [...SYN.keys()].filter(k => !k.includes(' ') && k.length >= 5);
const fuzzyCanonCache = new Map();

function canonicalFuzzy(t) {
  const direct = SYN.get(t);
  if (direct) return direct;
  if (t.length < 5) return t;
  if (fuzzyCanonCache.has(t)) return fuzzyCanonCache.get(t);

  let hit = t;
  for (const k of SYN_KEYS) {
    if (fuzzyOk(t, k)) { hit = SYN.get(k); break; }
  }
  fuzzyCanonCache.set(t, hit);
  return hit;
}

/* ---------- 3a. Base por categoría del catálogo ----------
   Evita repetir en cada producto lo que ya implica su rubro.      */
const CATEGORY_BASE = {
  'Juguetería': { tags:['juguete','infantil'], audience:['infantil','ninos','familia'],
    ages:['3-5','6-8','9-12'], occasions:['regalo','cumpleanos','dia del nino','navidad'],
    environments:['habitacion'], useCases:['jugar','regalar','entretener'] },
  'Librería':   { tags:['escuela','escritura'], audience:['estudiantes','ninos','adultos'],
    ages:['6-8','9-12','adolescentes'], occasions:['vuelta al cole','regalo'],
    environments:['escuela','oficina','escritorio'], useCases:['estudiar','escribir','dibujar'] },
  'Bazar':      { tags:['hogar'], audience:['adultos','familia'], ages:['adultos'],
    occasions:['regalo'], environments:['hogar','cocina'], useCases:['organizar','cocinar'] },
  'Electrónica':{ tags:['tecnologia','hogar'], audience:['adultos','familia'], ages:['adultos'],
    occasions:['regalo'], environments:['hogar'], useCases:['usar'] },
  'Tecnología': { tags:['tecnologia'], audience:['adultos','adolescentes'], ages:['adolescentes','adultos'],
    occasions:['regalo','regalo tecnologico'], useCases:['usar'] },
  'Regalería':  { tags:['regalo','decoracion'], audience:['adolescentes','adultos','infantil'],
    ages:['adolescentes','adultos'], occasions:['regalo','cumpleanos','navidad'],
    environments:['hogar'], useCases:['regalar','decorar'] }
};

/* ---------- 3b. Taxonomía: subcategorías + facetas ----------
   when  = palabras que, si aparecen en nombre/desc/cat, activan el tema
   El PRIMER tema que matchea define la subcategoría; todos los que
   matchean aportan sus facetas.                                     */
const TAXONOMY = [
  { sub:'Muñecas y bebotes', when:['muneca','barbie','bebe','baby','bomboncito','llorona','gordito','carinito','maymay','hada','dressy','vogue girl','doll'], tags:['muneca','infantil'], aliases:['munequita','bebote','bebe de juguete'], audience:['nena','ninas','infantil'], ages:['3-5','6-8'], useCases:['jugar','cuidar','juego simbolico','regalar'], environments:['habitacion'], intents:['regalo para nena','juguete para nena','muneca para nena','regalo para nina'] },
  { sub:'Peluches', when:['peluche','osito','perrito','conejito','pollito','squeeze','peludo','felpa','estrella repetidora'], tags:['peluche','infantil'], aliases:['muneco de peluche'], audience:['infantil','ninos'], ages:['bebe','3-5','6-8'], useCases:['abrazar','jugar','regalar'], environments:['habitacion'], intents:['peluche para regalar','algo suave para chicos'] },
  { sub:'Autos y vehículos de juguete', when:['autit','auto 360','camion','camionet','volcador','todoterreno','variant car','stunt rotation','tanque'], tags:['auto','juguete'], aliases:['autito de juguete','camioncito'], audience:['nene','ninos','infantil'], ages:['3-5','6-8'], useCases:['jugar','coleccionar'], environments:['aire libre'], intents:['auto de juguete','autito para nene','camion de juguete'] },
  { sub:'Vehículos a control remoto', when:['control remoto','r c','lizard','gesture','radiocontrol','stunt car','rc ev'], tags:['control remoto','auto','tecnologia'], aliases:['rc','teledirigido'], audience:['ninos','adolescentes','nene'], ages:['6-8','9-12','adolescentes'], useCases:['jugar'], environments:['aire libre'], intents:['juguete a control remoto','auto a control remoto'] },
  { sub:'Juguetes voladores', when:['avion','avioncito','helicoptero','drone','planeador','spinner','aerobat','voladora','speed plane'], tags:['volador','juguete'], aliases:['avioncito','dron'], audience:['ninos','adolescentes','nene'], ages:['6-8','9-12','adolescentes'], useCases:['jugar','volar','filmar'], environments:['aire libre'], intents:['juguete que vuela','drone para regalar'] },
  { sub:'Juguetes acuáticos', when:['race boat','velero','sailboat','dinghy','rubber dinghy'], tags:['acuatico','juguete'], aliases:['lanchita','barquito'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['jugar'], environments:['pileta','banera','aire libre'], intents:['juguete para la pileta','juguete para el agua','juguete para verano'] },
  { sub:'Juegos de mesa y cartas', when:['naipe','poker','uno','carta','dado','dados','basta','sushi do','chips','tic tac toe','tateti','hungry frogs'], tags:['juego de mesa','entretener'], aliases:['mazo','juego de cartas'], audience:['familia','adolescentes','adultos','ninos'], ages:['6-8','9-12','adolescentes','adultos'], useCases:['jugar en familia','entretener'], environments:['mesa','viaje'], intents:['juego para toda la familia','juego de mesa','juego para reuniones'] },
  { sub:'Juguetes didácticos', when:['puzzle','rompecabeza','magnetico','tetris','construccion','castle','encastre','builder','blocks','bloque','ladrillo','brick','diamond face','module world','deformecha','tablero de conteo','conteo','tangram','pixel'], tags:['didactico','infantil'], aliases:['bloques','armado'], audience:['infantil','ninos','estudiantes'], ages:['3-5','6-8','9-12'], useCases:['aprender','armar','desarrollar la logica','regalar'], environments:['escuela'], intents:['juguete didactico','juguete educativo','para aprender jugando'] },
  { sub:'Juguetes electrónicos', when:['games console','ball grabber','registradora','dancing','bailarin','cactus','luces y sonido','game machine','speed push','talking'], tags:['juguete','tecnologia'], aliases:['juguete con luces'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['jugar','entretener'], environments:['habitacion'], intents:['juguete con luces y sonido','juguete electronico'] },
  { sub:'Juegos creativos', when:['slime','masa','kapibala','plastilina','masilina','masilla','modelar','sello'], tags:['dibujo','infantil'], aliases:['masa moldeable'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['crear','entretener'], environments:['habitacion'], intents:['slime','algo para entretener a los chicos'] },
  { sub:'Juegos de rol', when:['registradora','space station','caja registradora','cocinita'], tags:['didactico','infantil'], aliases:['juego de imitacion'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['jugar','aprender'], environments:['habitacion'], intents:['juego de imitacion','juguete para jugar a la tienda'] },
  { sub:'Alcancías', when:['alcancia','mini bank'], tags:['organizar','infantil'], aliases:['alcancia'], audience:['infantil','ninos'], ages:['6-8','9-12'], useCases:['guardar','ahorrar','regalar'], environments:['habitacion'], intents:['alcancia para chicos','para que ahorren'] },
  { sub:'Coleccionables', when:['funko','coleccion','figura de vinil'], tags:['coleccion','regalo'], aliases:['figura','muneco de coleccion'], audience:['adolescentes','adultos'], ages:['adolescentes','adultos'], useCases:['coleccionar','regalar','decorar'], environments:['habitacion','escritorio'], intents:['regalo para fanaticos','figura de coleccion'] },
  { sub:'Gorras y accesorios', when:['gorra','vincha','mochila'], tags:['ropa','regalo'], aliases:['gorrita'], audience:['ninos','adolescentes'], ages:['6-8','9-12','adolescentes'], useCases:['usar','regalar'], environments:['aire libre','escuela','viaje'], intents:['gorra','accesorio para regalar'] },
  { sub:'Iluminación y decoración', when:['lampara','linterna','star master','tablero de mensaje','proyect','luminosa','luminoso','led','velador','luz nocturna','neon'], tags:['luz','decoracion'], aliases:['velador','luz led'], audience:['adolescentes','adultos','ninos'], ages:['adolescentes','adultos'], useCases:['iluminar','decorar','regalar'], environments:['habitacion','hogar','escritorio'], intents:['luz para la habitacion','algo para decorar','luz led'] },
  { sub:'Cuidado del cabello', when:['alisador','rizado','cepillo alisador','barrillete'], tags:['pelo','belleza'], aliases:['planchita','buclera'], audience:['adolescentes','adultos','mujeres'], ages:['adolescentes','adultos'], useCases:['peinar','alisar','regalar'], environments:['bano','hogar'], intents:['plancha para el pelo','algo para el cabello','regalo para mujer'] },
  { sub:'Masajeadores y bienestar', when:['masaje','massage','masajeador','fascia','scalp','cervical','muscular','9 bolas'], tags:['masaje','bienestar'], aliases:['masajeador'], audience:['adultos','deportistas'], ages:['adultos'], useCases:['relajar','descontracturar','regalar'], environments:['hogar','oficina'], intents:['algo para el dolor de espalda','masajeador','regalo para adultos'] },
  { sub:'Cuidado personal y salud', when:['nebulizador','doppler','fetal','belleza para cuello','ems','afeitadora','barba','ronquido','anti snore','bucal'], tags:['salud','belleza'], aliases:['cuidado personal'], audience:['adultos'], ages:['adultos'], useCases:['cuidar la salud'], environments:['hogar'], intents:['cuidado personal','salud en casa'] },
  // Va ANTES que "Electrodomésticos de cocina": mismo criterio de "el
  // primer tema que matchea define la subcategoría" — así una cafetera
  // se etiqueta como "Cafeteras y accesorios de café" (más preciso) en
  // vez de caer en el genérico "Electrodomésticos de cocina". El tag
  // "cafe" (nuevo, separado de "cocina") es lo que hace que buscar
  // "café"/"cafetera" encuentre SÓLO esto — no balanzas, pavas para
  // huevo ni utensilios — y que buscar "cocina" los siga encontrando
  // igual, porque también llevan el tag "cocina" de siempre.
  { sub:'Cafeteras y accesorios de café', when:['cafe','cafes','cafetera','cafeteras','moka','espresso','capuchino','cappuccino','barista','coffee','espumador'], tags:['cafe','cocina','hogar'], aliases:['maquina de cafe','coffee maker'], audience:['adultos','familia'], ages:['adultos'], useCases:['preparar cafe','cocinar','regalar'], environments:['cocina','hogar'], intents:['algo para el cafe','maquina de cafe','cafetera para el desayuno','accesorios de cafe'] },
  { sub:'Electrodomésticos de cocina', when:['pava','molinillo','balanza','dispenser de agua','batidor','hervidora'], tags:['cocina','hogar'], aliases:['electrodomestico'], audience:['adultos','familia'], ages:['adultos'], useCases:['cocinar','preparar cafe','pesar','regalar'], environments:['cocina','hogar'], intents:['algo para la cocina','cosas para cocina','regalo util para la casa'] },
  { sub:'Limpieza y orden', when:['cesto','basura','quitapelusa','pelusa'], tags:['limpieza','organizar','hogar'], aliases:['tacho','cesto'], audience:['adultos','familia'], ages:['adultos'], useCases:['limpiar','organizar','guardar'], environments:['cocina','bano','oficina','hogar'], intents:['algo para organizar','para la limpieza','tacho de basura'] },
  { sub:'Climatización', when:['heater','calefactor','estufa'], tags:['hogar'], aliases:['calefactor'], audience:['adultos','familia'], ages:['adultos'], useCases:['calefaccionar'], environments:['hogar','oficina','bano'], intents:['algo para el frio','calefactor'] },
  { sub:'Accesorios para computadora y celular', when:['cargador','notebook','usb c','adaptador','cable de carga','carga rapida','teclado','mouse','presentador','smartwatch','impresora','smart tag','localizador'], tags:['celular','cargador','tecnologia'], aliases:['cargador','cable'], audience:['estudiantes','adultos','adolescentes'], ages:['adolescentes','adultos'], useCases:['cargar','trabajar','estudiar'], environments:['oficina','escritorio','viaje'], intents:['algo para el celular','accesorios para celu','para cargar el celular','cargador'] },
  { sub:'TV, streaming y gaming', when:['tv box','game stick','joystick','control inalambrico','smart tv','1000 juego'], tags:['gaming','tecnologia'], aliases:['consola','convertidor smart tv'], audience:['adolescentes','adultos','familia'], ages:['9-12','adolescentes','adultos'], useCases:['jugar','ver peliculas','entretener'], environments:['hogar','living'], intents:['consola de juegos','convertir la tv en smart','regalo tecnologico'] },
  { sub:'Accesorios para el auto', when:['compresor','blackbox','dvr','vehicle','g sensor'], tags:['accesorio auto','tecnologia'], aliases:['accesorio para el auto'], audience:['adultos'], ages:['adultos'], useCases:['inflar','grabar','viajar'], environments:['auto','bici','ruta','viaje'], intents:['cosas para el auto','accesorio para el auto','camara para el auto','para la bici','para el auto','cosas para mi auto','algo para el auto'] },
  { sub:'Pizarras y escritura', when:['pizarra','writing tablet','tablero de mensaje','lcd writing'], tags:['escritura','dibujo','escuela'], aliases:['tableta de escritura','pizarra magica'], audience:['estudiantes','ninos','adultos'], ages:['3-5','6-8','9-12'], useCases:['escribir','dibujar','estudiar','anotar'], environments:['escuela','escritorio','oficina'], intents:['para el colegio','algo para dibujar','para estudiar','pizarra para chicos'] },
  { sub:'Útiles escolares', when:['goma de borrar','marcador','lapiz','cuaderno','carpeta','cartuchera'], tags:['escuela','escritura'], aliases:['utiles escolares'], audience:['estudiantes','ninos'], ages:['6-8','9-12','adolescentes'], useCases:['estudiar','escribir'], environments:['escuela','escritorio'], intents:['utiles para la escuela','cosas para el colegio','vuelta al cole'] },
  { sub:'Iluminación de escritorio', when:['lampara led multifuncion','portalapices','escritorio'], tags:['luz','oficina','escuela'], aliases:['velador de escritorio'], audience:['estudiantes','adultos'], ages:['adolescentes','adultos'], useCases:['estudiar','iluminar','trabajar'], environments:['escritorio','oficina','escuela'], intents:['lampara para estudiar','luz para el escritorio'] },
  { sub:'Animales y personajes', when:['dinosaur','dino','lizard','capybara','capibara','kapibala','perrito','osito','conejito','pollito','cactus','crocodile','cocodrilo','caiman','rana','frogs','koala','jirafa','elefantito','t rex'], tags:['animal','infantil'], aliases:['animalito'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['jugar','regalar'], environments:['habitacion'], intents:['juguete de animales','dinosaurio de juguete'] },
  { sub:'Juguetes de acción', when:['shooting','lanzador','bolita de gel','dardo','blaster','pistola','attack','catapult','catapulta','dispara'], tags:['juguete'], aliases:['lanzador'], audience:['ninos','adolescentes','nene'], ages:['9-12','adolescentes'], useCases:['jugar','entretener'], environments:['aire libre','habitacion'], intents:['juguete para nene','juguete de accion'] },
  { sub:'Juguetes con sonido', when:['musica','canta','repite','ruge','baila','melodia'], tags:['audio','juguete'], aliases:['juguete musical'], audience:['infantil','ninos'], ages:['3-5','6-8'], useCases:['jugar','entretener'], environments:['habitacion'], intents:['juguete musical','juguete que habla'] },
  { sub:'Pistas y circuitos', when:['pista','track','looping','circuito','autopista','lavadero','car wash','rampa'], tags:['auto','juguete'], aliases:['pista de autos','circuito de autos'], audience:['infantil','ninos','nene'], ages:['3-5','6-8','9-12'], useCases:['jugar','coleccionar','entretener'], environments:['habitacion','mesa'], intents:['pista de autos','pista para autitos','juguete de autos'] },
  { sub:'Aprender inglés y primeras palabras', when:['flash card','talking','ingles','vocabulario','primeras palabras'], tags:['didactico','ingles','escuela'], aliases:['tarjetas parlantes','flash cards'], audience:['infantil','ninos','estudiantes'], ages:['3-5','6-8'], useCases:['aprender','estudiar','regalar'], environments:['habitacion','escuela'], intents:['para aprender ingles','juguete para aprender','primeras palabras'] },
  { sub:'Juguetes antiestrés', when:['pop it','popit','antiestres','speed push','fidget'], tags:['antiestres','juguete','entretener'], aliases:['pop it','juguete antiestres'], audience:['infantil','ninos','adolescentes'], ages:['6-8','9-12','adolescentes'], useCases:['jugar','entretener','concentrarse'], environments:['habitacion','viaje'], intents:['juguete antiestres','pop it','algo para los nervios'] },
  { sub:'Bebés y primera infancia', when:['cuna','sonajero','movil musical','recien nacido','abejita'], tags:['cuna','infantil','regalo'], aliases:['cosas para bebe'], audience:['infantil','familia'], ages:['bebe'], useCases:['dormir','estimular','regalar'], environments:['habitacion','cuna'], intents:['regalo para bebe','cosas para bebe','baby shower'] },
  { sub:'Utensilios de cocina', when:['vaporera','escurridor','colador','vajilla','olla','al vapor','escurreplatos'], tags:['cocina','hogar','organizar'], aliases:['utensilios de cocina'], audience:['adultos','familia'], ages:['adultos'], useCases:['cocinar','organizar','regalar'], environments:['cocina','hogar'], intents:['cosas para cocina','utensilios de cocina','algo para la cocina'] },
  { sub:'Cámaras y filmación', when:['camara deportiva','action cam','sumergible','filmar','1080p'], tags:['grabar','tecnologia','crear contenido'], aliases:['camara de accion','filmadora'], audience:['adolescentes','adultos'], ages:['adolescentes','adultos'], useCases:['grabar','filmar','viajar','regalar'], environments:['aire libre','viaje','bici'], intents:['camara para grabar','camara deportiva','algo para filmar'] },
  { sub:'Rastreadores y localizadores', when:['smart tag','localizador','rastreador','find my','anti acoso'], tags:['rastreador','tecnologia','celular'], aliases:['localizador bluetooth','smart tag'], audience:['adultos','adolescentes','estudiantes'], ages:['adolescentes','adultos'], useCases:['encontrar','viajar','regalar'], environments:['viaje','mochila','auto'], intents:['para no perder las llaves','localizador','rastreador bluetooth'] }
];

// Pre-normalización de la taxonomía
TAXONOMY.forEach(t => { t._when = t.when.map(norm); });
const FACETS = ['tags','aliases','audience','ages','occasions','environments','useCases','features'];

/* ---------- 4. Enriquecimiento automático ---------- */
const W = { name:100, namePrefix:80, cat:70, sub:65, intent:60, tags:55,
            useCases:50, audience:45, environments:45, occasions:40,
            aliases:40, ages:35, features:35, desc:30, nameFuzzy:45, fuzzy:22 };

/**
 * Deriva los metadatos internos de un producto a partir de
 * cat + name + desc (+ campos opcionales tags/sub).
 * Devuelve las facetas y un Map término -> peso listo para el scoring.
 */
function enrichProduct(p) {
  const hay = norm([p.name, p.description, p.category, p.tags || ''].join(' '));
  const hayToks = new Set(hay.split(' '));
  const hasWord = k => k.includes(' ')
    ? (' ' + hay).includes(' ' + k)      // frase: debe arrancar en límite de palabra
    : (k.length < 5 ? hayToks.has(k) : hay.includes(k));

  const f = { category: p.category, subcategory: p.sub || null, intents: [] };
  FACETS.forEach(k => f[k] = new Set());

  // 4a. base por categoría
  const base = CATEGORY_BASE[p.category];
  if (base) for (const k in base) base[k].forEach(v => f[k] && f[k].add(v));

  // 4b. temas de la taxonomía
  TAXONOMY.forEach(t => {
    if (!t._when.some(hasWord)) return;
    if (!f.subcategory) f.subcategory = t.sub;
    FACETS.forEach(k => (t[k] || []).forEach(v => f[k].add(v)));
    (t.intents || []).forEach(i => f.intents.push(key(i)));
  });

  // 4c. términos propios del producto (nombre y tags) como tags
  stems(p.name).forEach(w => { if (w.length > 3) f.tags.add(w); });
  if (p.tags) stems(p.tags).forEach(w => { if (w.length > 3) f.tags.add(w); });

  // 4d. Map término canónico -> peso (el más alto gana)
  const terms = new Map();
  const put = (v, w) => {
    const c = canonical(key(v));
    if (!c) return;
    if (!terms.has(c) || terms.get(c) < w) terms.set(c, w);
  };
  if (f.subcategory) stems(f.subcategory).forEach(w => put(w, W.sub));
  stems(p.category).forEach(w => put(w, W.cat));
  FACETS.forEach(k => f[k].forEach(v => put(v, W[k] || W.tags)));

  return { facets: f, terms };
}

/* ---------- 5. Índice ---------- */
// price ya viene numérico desde products.json; se tolera el string
// ("$56.000") por si alguna vez vuelve a entrar en ese formato.
const priceOf = p =>
  typeof p.price === 'number' ? p.price : parseInt(String(p.price).replace(/[^\d]/g, ''), 10) || 0;

let INDEX = [];
let CHEAP_MAX = 0;
let PRICEY_MIN = 0;

export function buildIndex(products) {
  INDEX = products.map((p, i) => {
    const e = enrichProduct(p);
    const nameToks = stems(p.name);
    return {
      p, idx: i, price: priceOf(p),
      nameToks, nameSet: new Set(nameToks),
      hayToks: [...new Set(toks(p.name + ' ' + p.description))],
      descToks: new Set(stems(p.description + ' ' + (p.tags || ''))),
      terms: e.terms, intents: e.facets.intents, facets: e.facets
    };
  });

  // Umbral dinámico de "barato": tercio inferior de precios reales del catálogo
  const PRICES = INDEX.map(e => e.price).filter(Boolean).sort((a, b) => a - b);
  const pct = q => PRICES.length ? PRICES[Math.floor((PRICES.length - 1) * q)] : 0;
  CHEAP_MAX = pct(0.33);
  PRICEY_MIN = pct(0.66);
  return INDEX;
}

export const getIndex = () => INDEX;

/* ---------- 6. Intención de precio ----------
   "barato" / "economico"      -> hasta el percentil 33 del catálogo
   "caro" / "premium"          -> desde el percentil 66
   "menos de 10000" / "hasta 20 mil" / "entre 10 y 20 mil" / "mas de 30000"
   Devuelve {min,max,sort} y la consulta sin esos términos.        */
function parsePriceIntent(text) {
  let s = ' ' + norm(text) + ' ';
  let min = null, max = null, sort = 0;

  const num = str => {
    let v = parseFloat(str.replace(/\./g, '').replace(',', '.'));
    return isNaN(v) ? null : v;
  };
  const scale = (v, milTag) => (milTag || v <= 999) ? v * 1000 : v;

  // entre A y B (mil)
  s = s.replace(/entre\s+(\d[\d.,]*)\s*(mil|k)?\s*y\s*(\d[\d.,]*)\s*(mil|k)?/g, (m, a, ka, b, kb) => {
    const A = scale(num(a), ka || kb), B = scale(num(b), kb || ka);
    if (A != null && B != null) { min = Math.min(A, B); max = Math.max(A, B); }
    return ' ';
  });
  // menos de / hasta / bajo
  s = s.replace(/(menos de|hasta|por debajo de|maximo)\s+(\d[\d.,]*)\s*(mil|k)?/g, (m, _p, a, k) => {
    const A = scale(num(a), k); if (A != null) max = max == null ? A : Math.min(max, A); return ' ';
  });
  // mas de / desde / arriba de
  s = s.replace(/(mas de|desde|arriba de|minimo)\s+(\d[\d.,]*)\s*(mil|k)?/g, (m, _p, a, k) => {
    const A = scale(num(a), k); if (A != null) min = min == null ? A : Math.max(min, A); return ' ';
  });

  // adjetivos relativos
  const rest = [];
  s.split(' ').filter(Boolean).forEach(w => {
    if (['barato','baratos','barata','baratas','economico','economica','economicos','economicas',
         'accesible','oferta','ofertas','promo','promocion'].includes(w)) {
      max = max == null ? CHEAP_MAX : Math.min(max, CHEAP_MAX); sort = 1;
    } else if (['caro','caros','cara','premium','importado'].includes(w)) {
      min = min == null ? PRICEY_MIN : Math.max(min, PRICEY_MIN); sort = -1;
    } else rest.push(w);
  });

  return { min, max, sort, rest: rest.join(' ') };
}

/* ---------- 7. Fuzzy acotado ---------- */
function editDist(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1,
                        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < best) best = cur[j];
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const fuzzyOk = (a, b) => {
  if (a.length < 4 || b.length < 4) return false;
  const max = a.length <= 5 ? 1 : 2;
  return editDist(a, b, max) <= max;
};

/* ---------- 8. Scoring ---------- */
function scoreToken(entry, t) {
  let best = 0;
  if (entry.nameSet.has(t)) best = W.name;
  else if (t.length >= 5 && entry.nameToks.some(w => w.startsWith(t))) best = W.namePrefix;

  const c = canonicalFuzzy(t);
  const fw = entry.terms.get(c);
  if (fw && fw > best) best = fw;

  if (best < W.desc && entry.descToks.has(t)) best = W.desc;
  if (best < 28 && t.length >= 5 && entry.hayToks.some(w => w.startsWith(t))) best = 28;
  if (best < W.nameFuzzy && entry.nameToks.some(w => fuzzyOk(t, w))) best = W.nameFuzzy;
  return best;
}

const MIN_SCORE = 30;     // umbral absoluto anti-ruido
const REL_CUTOFF = 0.45;  // umbral relativo al mejor resultado

/**
 * Busca sobre `pool` (índice ya filtrado por chip de rubro).
 * Combina: dimensiones semánticas + intención de precio + fuzzy.
 */
function searchProducts(raw, pool) {
  const money = parsePriceIntent(raw);
  let qt = toks(money.rest).filter(t => !STOPWORDS.has(t)).map(stem).filter(t => t.length > 1);

  const inRange = e =>
    (money.min == null || e.price >= money.min) &&
    (money.max == null || e.price <= money.max);

  // Sólo intención de precio: devolvemos el rango ordenado
  if (!qt.length) {
    const list = pool.filter(inRange);
    list.sort((a, b) => (money.sort === -1 ? b.price - a.price : a.price - b.price) || (a.idx - b.idx));
    const hasMoney = money.min != null || money.max != null;
    return hasMoney || money.sort ? list.map(e => e.p) : pool.map(e => e.p);
  }

  const phrase = key(money.rest);
  const scored = [];

  for (const entry of pool) {
    if (!inRange(entry)) continue;

    let total = 0, hits = 0;
    for (const t of qt) {
      const s = scoreToken(entry, t);
      if (s > 0) { total += s; hits++; }
    }
    if (!hits) continue;

    // frase de intención completa ("regalo para nena", "cosas para el auto")
    if (entry.intents.some(i => i === phrase || (i.includes(' ') && phrase.includes(i)))) {
      total += W.intent; hits++;
    }
    if (total < MIN_SCORE) continue;

    // cubrir más dimensiones de la consulta pesa más
    total *= 1 + 0.5 * ((hits - 1) / qt.length);
    scored.push({ p: entry.p, s: total, price: entry.price, idx: entry.idx });
  }

  scored.sort((a, b) => (b.s - a.s) || (a.idx - b.idx));

  // Corte relativo: descarta lo que quede muy por debajo del mejor resultado.
  // Evita que una consulta amplia ("casa", "regalo") devuelva medio catálogo.
  const top = scored.length ? scored[0].s : 0;
  return scored.filter(x => x.s >= top * REL_CUTOFF).map(x => x.p);
}

export { searchProducts, parsePriceIntent, norm, toks, stems, key };
