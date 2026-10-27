# Paridad del generador móvil con escritorio

## Alcance
- Replicar la asignación manual exacta y la automática por cobertura de las temporadas históricas seleccionadas; el tope de columnas es técnico y no fija el presupuesto.
- Estimar el riesgo de desviación como 1 menos la probabilidad del signo más probable y ordenar los partidos del más arriesgado al más seguro. El selector 0–10 amplía de 4 a 14 partidos elegibles.
- Permitir editar/normalizar/guardar la matriz y cargar fuentes locales con identidad de jornada y equipos validada.
- Ponderar explícitamente fuentes auxiliares importadas (clasificación, forma 5 jornadas e historial).
- Integrar las seis tablas de reducida publicadas que usa el escritorio, con base y posiciones, coste y aviso de cobertura condicional.

## Criterios de aceptación
- La misma matriz y parámetros producen la misma asignación determinista que el escritorio.
- Fuentes importadas no se mezclan entre jornadas ni partidos diferentes.
- Las tablas móviles tienen el mismo número, anchuras, patrones y mínimo de aciertos que el catálogo de escritorio.
- El factor sorpresa prioriza los partidos con mayor probabilidad estimada de fallo del favorito y expone el cálculo por partido.
- Guardar/restaurar y los flujos actuales de pronóstico, sistemas y escrutinio se conservan.
- Compilación Android y pruebas automatizadas de motor y serialización pasan; APK instalada en dispositivo y cambios publicados en GitHub.
