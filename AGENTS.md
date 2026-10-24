# Guía de desarrollo

- Alcance inicial: app Android para **Escrutinio**. No añadir generación de
  apuestas, optimización ni filtros en esta fase.
- Mantener Java como puente pequeño de Android y HTML/CSS/JavaScript para la
  interfaz y la comprobación local. No introducir servidor propio.
- Los datos descargados se identifican por temporada y jornada. Comprobar la
  identidad antes de calcular o mostrar premios.
- No estimar dinero con marcadores provisionales. El PRE definitivo es la
  fuente del premio y el TXT importado es solo la base del cálculo.
- No solicitar credenciales, enviar apuestas ni activar pagos.
- Cambios funcionales requieren RF, pruebas reproducibles, actualización de
  `docs/12_MATRIZ_TRAZABILIDAD.md` y `CHANGELOG.md`.
- Mantener los proveedores externos detrás del puente Android, con timeout,
  límite de descarga y mensaje claro cuando no haya red.
