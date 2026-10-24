# Escrutinio móvil v0.1

## Objetivo

Crear un repositorio Android autónomo que implemente una sola tarea clara:
consultar resultados y comprobar apuestas TXT importadas. Se reutiliza el formato
WIN1X2 PRE y la fuente pública de marcadores ya usada por la aplicación de
escritorio. El código se mantiene separado del escritorio.

## Alcance

- RF-MOV-001: descargar datos de temporadas/jornadas; seleccionar una jornada;
  importar TXT de 14 o 16 signos; mostrar marcador, signo, acierto/error y mejor
  apuesta individual.
- RF-MOV-002: cuando PRE tenga resultado definitivo, mostrar categorías 15–10,
  número propio de apuestas y premios unitarios/subtotales. Si PRE no es final,
  mostrar aciertos confirmados y pendientes, sin calcular dinero.
- RF-MOV-003: persistir los datos y TXT importados por temporada/jornada para
  continuar sin conexión y sin mezclar sorteos.

## Arquitectura

- Android Java: WebView, descarga acotada de calendario y selección segura de TXT.
- Interfaz local HTML/CSS/JS: una sola pantalla de Escrutinio.
- Motor JS puro: parsing de PRE y conteo determinista, con pruebas Node sin Android.
- `localStorage`: estado local, separado por temporada y jornada.

## Criterios de aceptación

- Se puede recorrer temporadas y jornadas publicadas.
- El TXT tiene solo signos válidos, 14 o 16 caracteres por línea; los nombres
  de archivo con temporada/jornada incompatible se rechazan.
- Cada partido muestra local, visitante, resultado, signo oficial y acierto.
- Sin resultado definitivo no aparece premio económico.
- Con PRE definitivo, premio 15 se suma a 14 cuando corresponda; los premios se
  calculan en céntimos a partir de importes publicados.
- Con errores de red, quedan visibles los últimos datos guardados.
- APK debug compila y las pruebas del motor pasan.

## Estado de la entrega

Implementado para v0.1. La interfaz y el motor están aislados del escritorio;
el puente Android acota hosts, tiempos y tamaños de descarga. El motor se ha
validado con casos deterministas de PRE, premios en céntimos, marcador 0–0
pendiente, Pleno y búsqueda de jornada. El APK debug compila. La validación
visual e importación SAF se validaron en un Samsung Galaxy S20+ (SM-G986N).
Se comprobaron descarga real, cambio de temporada y jornada, rechazo de TXT
inválido, importación de TXT válido, resultados PRE definitivos, desglose de
premios y restauración después de forzar el cierre. El feed en directo se
rechaza si no hay una jornada correspondiente a la selección; no se atribuyen
marcadores de otros partidos.

## Fuera de alcance

Crear/editar quinielas, sistemas, cuotas, autenticación, envío y cobro.
