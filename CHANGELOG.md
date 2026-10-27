# Cambios

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
