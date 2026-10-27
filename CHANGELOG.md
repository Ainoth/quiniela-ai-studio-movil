# Cambios

## 0.5.7 — escala de riesgo corregida

- Invierte la escala de riesgo para que el nivel mínimo conserve el 97% de la muestra y el muy alto el 50%. A más riesgo, el filtro es más estrecho y aumenta la posibilidad de excluir resultados históricos.
- Actualiza la descripción y las pruebas de monotonicidad del selector.
- Verificado con pruebas automatizadas y compilación Android.


## 0.5.6 — niveles de riesgo para Condiciones automáticas

- Añade cinco niveles de riesgo. Cada nivel determina la cobertura de frecuencias históricas que se incluye al calcular cantidades y rachas; los niveles altos admiten valores menos frecuentes.
- El cambio de nivel actualiza las casillas automáticamente cuando está activo el modo histórico.
- Verificado con pruebas automatizadas y compilación Android.


## 0.5.5 — ajuste automático de Condiciones por histórico

- Añade un modo automático que selecciona cantidades de signos y longitudes de racha a partir de las temporadas históricas marcadas.
- Usa el objetivo de cobertura histórica ya configurado y recalcula las condiciones cuando cambian las temporadas o ese objetivo. Editar una casilla cambia a modo manual.
- Hace las casillas ligeramente más altas, de 18 a 20 px, manteniendo su ancho.
- Verificado con 27 pruebas y compilación Android.


## 0.5.4 — altura cuadrada de las casillas

- Anula la altura mínima general de los botones en las casillas de Condiciones y fija su altura en 18 px para mantenerla acorde con el ancho existente.
- Verificado con pruebas automatizadas y compilación Android.


## 0.5.3 — cabeceras para las casillas de Condiciones

- Mueve los valores de cada grupo a una cabecera de columna y deja las casillas sin texto interior.
- Reduce la altura de las casillas para que las barras sean más compactas.
- Verificado con pruebas automatizadas y compilación Android.


## 0.5.2 — sorpresa independiente y condiciones por valor

- Separa el factor sorpresa de la diferenciación del público. El modo automático
  determina las cantidades de dobles y triples únicamente con el histórico
  seleccionado y los porcentajes activos; el factor sorpresa solo cambia sus
  posiciones.
- El botón del Pleno alterna entre pronóstico automático y selección manual.
- Condiciones permite activar y desactivar cantidades exactas de 1, X, 2 y
  variantes, además de longitudes concretas de racha.
- En Mis sistemas, los botones vuelven a ser pequeños y se alinean a la derecha.
  En Escrutinio, recuperan el ancho completo con texto legible y menos altura.
- Añade migración de los filtros guardados y pruebas de cantidades, rachas y
  conservación de dobles/triples al aplicar sorpresa.


## 0.5.1 — Pleno automático y controles legibles

- El Pleno se completa automáticamente con el resultado más probable de cada
  equipo: primero usa las marginales de mercado publicadas y, si faltan, las
  frecuencias de los resultados históricos de las temporadas seleccionadas.
  Tocar los goles permite pasar a selección manual y volver al modo automático.
- Hace más visual la configuración de condiciones con filas y colores por signo.
- Recupera el tamaño legible de texto en Mis sistemas y Escrutinio; reduce el
  área de los botones de Escrutinio con menos altura y relleno.
- Verificado con pruebas automatizadas y compilación Android.

## 0.5.0 — navegación y controles compactos

- Hace visibles las temporadas del modo automático y deja las cantidades de
  dobles y triples bloqueadas salvo que se elija el modo manual.
- Une factor sorpresa y diferenciación del público en un único control de
  estrategia, manteniendo el efecto de riesgo y el ajuste contra popularidad.
- Muestra los equipos del Pleno al 15 y conserva las reducciones dentro de una
  sección plegable de Quiniela, sin una pestaña dedicada.
- Simplifica Mis sistemas, deja Ajustes al final de la navegación y compacta
  los controles y filas de Escrutinio, con día y hora junto al número de partido.
- Verificado con pruebas automatizadas y compilación Android.

## 0.4.0 — generación histórica y factor sorpresa

- La generación automática selecciona dobles y triples según los resultados de
  las temporadas históricas marcadas y el objetivo de cobertura de esa muestra.
  El límite de columnas es técnico; el importe solo interviene al optimizar en
  Reducidas.
- Añade el factor sorpresa: estima el riesgo de fallo del signo favorito como
  1 menos su probabilidad, ordena los partidos y amplía progresivamente el grupo
  candidato de 4 a 14. Muestra el porcentaje estimado en cada partido.
- Añade diferenciación del público, basada en Mercado y Popularidad.
- Incorpora el catálogo de tablas reducidas y el histórico empaquetado para
  generar sin conexión.
- Verificado con pruebas automatizadas y compilación Android.

## 0.3.0 — Base de generación y reducida por presupuesto

- Sustituye los niveles de cobertura fijos por asignación automática según la
  fuente y configuración manual de dobles, triples y máximo de columnas.
- Añade la sección Reducidas para seleccionar columnas con presupuesto,
  priorizando probabilidad y diversidad; permite restaurar el desarrollo
  completo. No presenta la selección como una reducción oficial garantizada.
- Conserva el desarrollo y sistemas asociados a cada jornada.

## 0.2.4 — Escrutinio al estilo autónomo y previsión integrada

- Recupera la presentación de la app Escrutinio autónomo dentro de la pestaña.
- Muestra la estimación orientativa en la app, con premios por categoría y
  escenario basado en marcadores actuales y favoritos de los partidos pendientes.
- Obtiene recaudación, bote y porcentajes publicados para calcular los importes;
  no abre páginas externas.

## 0.2.3 — resumen en directo y estimación orientativa

- Resume aciertos, fallos confirmados, aciertos provisionales y partidos
  pendientes para la mejor apuesta.
- Actualiza los marcadores cada minuto mientras Escrutinio está abierto y al
  volver a la app.
- Añadía acceso a la previsión pública de premios.

## 0.2.2 — presentación y validación de marcadores

- Da formato legible a los marcadores partido a partido.
- Omite solo los partidos cuyos equipos no coinciden con los del calendario y
  conserva los marcadores válidos del resto de la jornada.

## 0.2.1 — escrutinio visible en Quiniela AI Studio

- Añade una pestaña **Escrutinio** a la app completa, junto a Quiniela, Filtros,
  Análisis, Sistemas y Ajustes.
- Permite importar TXT o revisar el desarrollo actual, consultar marcadores y
  calcular premios solo con el PRE definitivo.
- Mantiene los datos de la app y permite exportar TXT también en Android 6–9.

## 0.2.0 — app Quiniela AI Studio

- Versión instalada previamente en algunos teléfonos, sin acceso visible a la
  pantalla de escrutinio.

## 0.1.3 — compatibilidad con Android 6 o posterior

- Reduce la versión mínima de Android 10 a Android 6 para permitir instalar la
  app en más teléfonos.

## 0.1.2 — Escrutinio dentro de Quiniela AI Studio

- La app aparece como **Quiniela AI Studio** en el teléfono para que el
  escrutinio quede integrado y sea fácil de encontrar.
- Mantiene la pantalla de escrutinio, importación de TXT, marcadores y premios
  oficiales de la versión anterior.
- Incrementa el número de versión Android para permitir instalar la
  actualización sobre la app existente.

## 0.1.1 — ajustes tras prueba en móvil

- Separa fecha y hora en la ficha de cada partido para mejorar la lectura.
- Aclara el aviso cuando el proveedor de marcadores no tiene la jornada
  seleccionada y vuelve a habilitar «Actualizar marcador» al restaurar la app.
- Verificado en Samsung Galaxy S20+ con Android mediante descarga real e
  importación de un TXT de prueba; las apuestas se conservan al reiniciar.

## 0.1.0 — primera entrega móvil de Escrutinio

- RF-MOV-001: consultar resultados de una temporada/jornada y comprobar TXT
  localmente, con desglose de aciertos por apuesta.
- RF-MOV-002: mostrar importes únicamente a partir de un escrutinio definitivo
  publicado en PRE; sin PRE definitivo solo mostrar aciertos confirmados.
- RF-MOV-003: guardar calendario y apuestas en el teléfono para consulta
  posterior sin conexión.
