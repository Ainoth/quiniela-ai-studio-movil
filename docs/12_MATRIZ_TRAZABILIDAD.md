# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-008 · generar base histórica o configurar manualmente fijos, dobles y triples | Implementado v0.4.0 | generación automática por cobertura de las temporadas marcadas; modo manual con cantidades exactas y límite técnico de seguridad |
| RF-MOV-009 · reducir el desarrollo al presupuesto y restaurar el original | Implementado v0.3.0 | sección Reducidas; subconjunto priorizado por probabilidad y diversidad, sin garantía de cobertura |
| RF-MOV-010 · ordenar partidos según posibilidad de que falle el signo favorito | Implementado v0.4.0 | factor sorpresa 0–10, porcentaje estimado por partido y selección automática restringida al grupo de 4–14 partidos de mayor riesgo |
| RF-MOV-011 · aplicar tablas reducidas oficiales | Implementado v0.4.0 | seis tablas; patrones, anchuras y cobertura mínima contrastados exhaustivamente |
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; selector y validación de TXT |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; lectura PRE y desglose de premios |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.2.2 | apuestas almacenadas en el estado local de Quiniela AI Studio, asociadas a temporada/jornada |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.2.2 | etiqueta Android y barra inferior |
| RF-MOV-005 · abrir el escrutinio desde la app completa | Implementado v0.2.2 | pestaña inferior Escrutinio; importa TXT o usa el desarrollo actual |
| RF-MOV-006 · ver aciertos, fallos y pendientes durante los partidos | Implementado v0.2.3 | resumen de la mejor apuesta y actualización automática cada minuto |
| RF-MOV-007 · consultar previsión orientativa de premios dentro de la app | Implementado v0.2.4 | recaudación, bote y porcentajes publicados; escenario con marcadores actuales y favoritos pendientes; mantiene el desglose PRE oficial |
