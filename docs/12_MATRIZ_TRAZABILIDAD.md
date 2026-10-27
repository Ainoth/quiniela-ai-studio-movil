# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-008 · configurar generación manual/automática de fijos, dobles y triples con máximo de columnas | Implementado v0.3.0 | controles en Quiniela; el modo automático elige según porcentajes guardados y límite indicado |
| RF-MOV-009 · reducir el desarrollo al presupuesto y restaurar el original | Implementado v0.3.0 | sección Reducidas; subconjunto priorizado por probabilidad y diversidad, sin garantía de cobertura |
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; selector y validación de TXT |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.2.2 | `tests/escrutinio.test.cjs`; lectura PRE y desglose de premios |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.2.2 | apuestas almacenadas en el estado local de Quiniela AI Studio, asociadas a temporada/jornada |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.2.2 | etiqueta Android y barra inferior |
| RF-MOV-005 · abrir el escrutinio desde la app completa | Implementado v0.2.2 | pestaña inferior Escrutinio; importa TXT o usa el desarrollo actual |
| RF-MOV-006 · ver aciertos, fallos y pendientes durante los partidos | Implementado v0.2.3 | resumen de la mejor apuesta y actualización automática cada minuto |
| RF-MOV-007 · consultar previsión orientativa de premios dentro de la app | Implementado v0.2.4 | recaudación, bote y porcentajes publicados; escenario con marcadores actuales y favoritos pendientes; mantiene el desglose PRE oficial |
