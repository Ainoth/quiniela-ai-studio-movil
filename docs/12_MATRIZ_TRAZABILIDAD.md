# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-012 · simplificar navegación y unificar estrategia de sorpresa/público | Implementado v0.5.0 | selector único, reducciones plegables en Quiniela, Ajustes al final |
| RF-MOV-013 · mostrar equipos de Pleno y compactar Escrutinio | Implementado v0.5.0 | nombres desde el calendario WIN1X2, día/hora bajo el número de partido y controles compactos |
| RF-MOV-008 · generar base histórica o configurar manualmente fijos, dobles y triples | Implementado v0.5.0 | temporadas seleccionadas visibles en modo automático; cantidades bloqueadas salvo modo manual |
| RF-MOV-009 · reducir el desarrollo al presupuesto y restaurar el original | Implementado v0.5.0 | sección plegable integrada en Quiniela; subconjunto priorizado por probabilidad y diversidad |
| RF-MOV-010 · ordenar partidos según posibilidad de que falle el signo favorito | Implementado v0.5.0 | estrategia combinada 0–10; ordena riesgos y, si hay ambas fuentes, diferencia signos menos populares |
| RF-MOV-011 · aplicar tablas reducidas oficiales | Implementado v0.5.0 | seis tablas disponibles dentro de la sección plegable de Quiniela |
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; selector y validación de TXT |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; lectura PRE y desglose de premios |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.2.2 | apuestas almacenadas en el estado local de Quiniela AI Studio, asociadas a temporada/jornada |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.2.2 | etiqueta Android y barra inferior |
| RF-MOV-005 · abrir el escrutinio desde la app completa | Implementado v0.2.2 | pestaña inferior Escrutinio; importa TXT o usa el desarrollo actual |
| RF-MOV-006 · ver aciertos, fallos y pendientes durante los partidos | Implementado v0.2.3 | resumen de la mejor apuesta y actualización automática cada minuto |
| RF-MOV-007 · consultar previsión orientativa de premios dentro de la app | Implementado v0.2.4 | recaudación, bote y porcentajes publicados; escenario con marcadores actuales y favoritos pendientes; mantiene el desglose PRE oficial |
