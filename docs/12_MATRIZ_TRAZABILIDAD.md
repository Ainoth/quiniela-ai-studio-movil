# Matriz de trazabilidad

| Requisito | Estado | Verificación |
|---|---|---|
| RF-MOV-001 · elegir jornada, importar TXT y mostrar aciertos por apuesta | Implementado v0.2.1 | `tests/escrutinio.test.cjs`; selector y validación de TXT |
| RF-MOV-002 · premios solo con PRE definitivo | Implementado v0.2.1 | `tests/escrutinio.test.cjs`; lectura PRE y desglose de premios |
| RF-MOV-003 · guardar y restaurar la jornada/apuestas localmente | Implementado v0.2.1 | apuestas almacenadas en el estado local de Quiniela AI Studio, asociadas a temporada/jornada |
| RF-MOV-004 · identificar en Android la app como Quiniela AI Studio | Implementado v0.2.1 | etiqueta Android y barra inferior |
| RF-MOV-005 · abrir el escrutinio desde la app completa | Implementado v0.2.1 | pestaña inferior Escrutinio; importa TXT o usa el desarrollo actual |
