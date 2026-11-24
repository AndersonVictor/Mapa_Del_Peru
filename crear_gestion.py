"""Crea gestion_administrativa.xlsx con la carga inicial del informe de gestion 2025-2026.

    python crear_gestion.py [--todo]
"""
import datetime as dt
import sys
from pathlib import Path

ROOT = Path(__file__).parent
DESTINO = ROOT / "gestion_administrativa.xlsx"
INFORME = "Informe de Gestión Administrativa CSJJU 2025-2026"
CARGA = dt.date(2026, 10, 28)


def d(s):
    return dt.datetime.strptime(s, "%d/%m/%Y").date() if s else None


def pag(n, extra=""):
    return f"{INFORME}, p. {n}" + (f" ({extra})" if extra else "")


ESTADOS = ["por validar", "validado", "corregido"]
EJES = ["Digital", "Infraestructura", "Equipamiento", "Capacitación", "Producción", "Cumplimiento", "Patrimonio",
        "Bienestar", "Acceso a la justicia", "Gestión institucional", "Recaudación", "Convenios", "Supervisión"]
UNIDADES = ["n", "S/", "%", "m²"]
TIPOS_SEDE = ["sede central", "MBJ", "subsede", "JPL", "archivo", "almacén"]
TIPOS_OBRA = ["mantenimiento", "adecuación", "ampliación", "nueva infraestructura"]
ESTADOS_OBRA = ["ejecutada", "en curso"]
ACCIONES = ["baja RAEE", "donación", "transferencia", "reposición"]
ESTADOS_INTERV = ["concluida", "en curso"]

# catalogos
OFICINAS = [
    ("GAD", "Gerencia de Administración Distrital", "Presidencia", "Gerente de Administración Distrital"),
    ("UPD", "Unidad de Planeamiento y Desarrollo", "GAD", "Jefe(a) de UPD"),
    ("UAF", "Unidad Administrativa y de Finanzas", "GAD", "Jefe(a) de UAF"),
    ("UFI", "Unidad Funcional de Integridad", "", ""),
    ("UDAJUP", "Oficina Distrital de Apoyo a la Justicia de Paz (UDAJUP)", "", ""),
    ("SECOM", "Servicios Judiciales – SECOM", "", ""),
    ("REDIJU", "Oficina de Registro Distrital Judicial (REDIJU)", "", ""),
    ("PPTO", "Planes y Presupuesto", "", ""),
    ("RRHH", "Recursos Humanos", "", ""),
    ("INFRA", "Coordinación de Infraestructura", "UAF", ""),
    ("INFO", "Coordinación de Informática", "", ""),
    ("EPR", "Estudios, Proyectos y Racionalización", "", ""),
    ("EST", "Estadística", "UPD", ""),
    ("OCP", "Oficina de Control Patrimonial", "UAF", ""),
    ("CONT", "Oficina de Contabilidad", "", ""),
    ("ARCH", "Archivo Desconcentrado", "", ""),
    ("MVIO", "Módulo Penal de Sanción de Delitos de Violencia contra la Mujer e Integrantes del Grupo Familiar", "", ""),
    ("MPEN", "Módulo Penal – Extinción de Dominio", "", ""),
    ("MLAB", "Módulo Corporativo Laboral", "", ""),
    ("ADM-TAR", "Administración del MBJ de Tarma", "", ""),
    ("ADM-PAM", "Administración del MBJ de Pampas", "", ""),
    ("ADM-CHU", "Administración de la Sede Chupaca", "", ""),
    ("ADM-JAU", "Administración del MBJ de Jauja", "", ""),
    ("SST", "Equipo de Seguridad y Salud en el Trabajo", "", ""),
    ("SEG", "Coordinación de Seguridad", "", ""),
    ("FLAG", "Unidad Piloto de Flagrancia Delictiva", "", ""),
]

SEDES = [
    ("HYO-CEN", "Sede Central – Huancayo", "Huancayo", "Huancayo", "sede central"),
    ("HYO-CUS", "Sede Jr. Cusco 790 (Unidad de Flagrancia) – Huancayo", "Huancayo", "Huancayo", "sede central"),
    ("HYO-JPL", "JPL de Huancayo", "Huancayo", "Huancayo", "JPL"),
    ("HYO-ALM", "Almacén Central – Huancayo", "Huancayo", "Huancayo", "almacén"),
    ("HYO-ARI", "Archivo Desconcentrado Jr. Ica – Huancayo", "Huancayo", "Huancayo", "archivo"),
    ("HYO-ARH", "Archivo Desconcentrado Av. Huancavelica – Huancayo", "Huancayo", "Huancayo", "archivo"),
    ("HYO-TAM", "Sede El Tambo (Juzgado de Extinción de Dominio)", "Huancayo", "El Tambo", "subsede"),
    ("HYO-CAJ", "JPL de San Agustín de Cajas", "Huancayo", "San Agustín de Cajas", "JPL"),
    ("CON-MBJ", "MBJ de Concepción", "Concepción", "Concepción", "MBJ"),
    ("TAR-MBJ", "MBJ de Tarma", "Tarma", "Tarma", "MBJ"),
    ("TAR-SAL", "Sede Sala de Tarma", "Tarma", "Tarma", "subsede"),
    ("TAY-MBJ", "MBJ de Pampas", "Tayacaja", "Pampas", "MBJ"),
    ("YAU-SUB", "Subsede de Yauli – La Oroya", "Yauli", "La Oroya", "subsede"),
    ("CHU-SED", "Sede Chupaca", "Chupaca", "Chupaca", "subsede"),
    ("JAU-MBJ", "MBJ de Jauja", "Jauja", "Jauja", "MBJ"),
    ("JUN-SED", "Sede Junín", "Junín", "Junín", "subsede"),
]

# id, apartado, eje, nombre, unidad, definición, oficina, periodicidad, sentido, es_calculado, fórmula
IND = [
    ("PPTO_PIA", "Presupuesto y recaudación", "Gestión institucional", "PIA (Presupuesto Institucional de Apertura)", "S/", "Presupuesto inicial del año (total UE 008)", "PPTO", "Anual", "mayor es mejor", "No", ""),
    ("PPTO_PIM", "Presupuesto y recaudación", "Gestión institucional", "PIM (Presupuesto Institucional Modificado)", "S/", "Presupuesto modificado a la fecha de corte", "PPTO", "Mensual", "mayor es mejor", "No", ""),
    ("PPTO_DEV", "Presupuesto y recaudación", "Gestión institucional", "Devengado", "S/", "Gasto devengado acumulado a la fecha de corte", "PPTO", "Mensual", "mayor es mejor", "No", ""),
    ("PPTO_PUESTO", "Presupuesto y recaudación", "Gestión institucional", "Puesto en ejecución entre UE del Poder Judicial", "n", "Posición por % de ejecución (1 = mejor)", "PPTO", "Mensual", "menor es mejor", "No", ""),
    ("PPTO_AVANCE", "Presupuesto y recaudación", "Gestión institucional", "% de ejecución presupuestal", "%", "Devengado sobre PIM", "PPTO", "Mensual", "mayor es mejor", "Sí", "PPTO_DEV / PPTO_PIM × 100"),
    ("PPTO_SALDO", "Presupuesto y recaudación", "Gestión institucional", "Saldo por ejecutar", "S/", "PIM menos devengado", "PPTO", "Mensual", "menor es mejor", "Sí", "PPTO_PIM − PPTO_DEV"),
    ("PPTO_VAR_PIM", "Presupuesto y recaudación", "Gestión institucional", "Variación del PIM respecto al PIA", "%", "", "PPTO", "Mensual", "mayor es mejor", "Sí", "(PPTO_PIM − PPTO_PIA) / PPTO_PIA × 100"),
    ("MULTAS", "Presupuesto y recaudación", "Recaudación", "Recaudación de multas judiciales", "S/", "Monto recaudado en el periodo cubierto", "SECOM", "Mensual", "mayor es mejor", "No", ""),
    ("ARCH_RECAUDA", "Presupuesto y recaudación", "Recaudación", "Recaudación por servicios archivísticos", "S/", "", "ARCH", "Mensual", "mayor es mejor", "No", ""),
    ("ARCH_ATENC", "Presupuesto y recaudación", "Recaudación", "Atenciones de servicios archivísticos", "n", "", "ARCH", "Mensual", "mayor es mejor", "No", ""),
    ("JORN_ACTOS", "Producción y justicia de paz", "Producción", "Actos procesales en jornadas extraordinarias", "n", "Suma de las jornadas judiciales extraordinarias del año", "EST", "Por jornada", "mayor es mejor", "No", ""),
    ("EXP_REMITIDOS", "Producción y justicia de paz", "Producción", "Expedientes remitidos al archivo", "n", "Remitidos al archivo definitivo (y provisional) en jornadas", "EST", "Por jornada", "mayor es mejor", "No", ""),
    ("EXP_DEVUELTOS", "Producción y justicia de paz", "Producción", "Expedientes devueltos al archivo mediante oficios", "n", "", "EST", "Por jornada", "mayor es mejor", "No", ""),
    ("CAP_SIJ", "Producción y justicia de paz", "Capacitación", "Capacitaciones en registro de hitos SIJ", "n", "", "EST", "Mensual", "mayor es mejor", "No", ""),
    ("CAP_SIJ_SERV", "Producción y justicia de paz", "Capacitación", "Servidores capacitados en SIJ", "n", "Jueces, juezas y personal jurisdiccional", "EST", "Mensual", "mayor es mejor", "No", ""),
    ("VIO_RESUELTOS", "Producción y justicia de paz", "Producción", "Expedientes resueltos – Módulo de Violencia", "n", "", "MVIO", "Anual", "mayor es mejor", "No", ""),
    ("VIO_META", "Producción y justicia de paz", "Producción", "% de la meta de producción – Módulo de Violencia", "%", "Avance reportado en el formato POI", "MVIO", "Anual", "mayor es mejor", "No", ""),
    ("JP_YACHAY", "Producción y justicia de paz", "Digital", "Juzgados de paz con YACHAY 2.0", "n", "Juzgados de paz incorporados al aplicativo", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_VIRT", "Producción y justicia de paz", "Capacitación", "Jueces de paz: cursos / capacitaciones virtuales", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_PRES", "Producción y justicia de paz", "Capacitación", "Jueces de paz: jornadas de capacitación presenciales", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_NAC", "Producción y justicia de paz", "Capacitación", "Jueces de paz: jornadas nacionales de capacitación", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_ENC", "Producción y justicia de paz", "Capacitación", "Jueces de paz: encuentros", "n", "Encuentro por el Día Internacional de la Mujer", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_YACHAY", "Producción y justicia de paz", "Capacitación", "Jueces de paz: cursos YACHAY", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_CAP_SISJUPAZ", "Producción y justicia de paz", "Capacitación", "Jueces de paz: cursos SISJUPAZ", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("JP_VISITAS", "Producción y justicia de paz", "Supervisión", "Visitas administrativas a juzgados de paz", "n", "", "UDAJUP", "Trimestral", "mayor es mejor", "No", ""),
    ("RCBP", "Producción y justicia de paz", "Supervisión", "Registros RCBP (control biométrico de procesados y sentenciados libres)", "n", "", "REDIJU", "Mensual", "mayor es mejor", "No", ""),
    ("RENAVINA", "Producción y justicia de paz", "Supervisión", "Registros RENAVINA", "n", "Autorizaciones de viaje de menores", "REDIJU", "Mensual", "mayor es mejor", "No", ""),
    ("CURIA_USU", "Producción y justicia de paz", "Digital", "Usuarios habilitados en CURIA (IA generativa)", "n", "", "INFO", "Al cambiar", "mayor es mejor", "No", ""),
    ("NICSP_IDENT", "Cumplimiento", "Cumplimiento", "Brechas NICSP identificadas", "n", "Diagnóstico inicial del Programa de Transición", "CONT", "Al recibir reporte", "menor es mejor", "No", ""),
    ("NICSP_IMPL", "Cumplimiento", "Cumplimiento", "Brechas NICSP implementadas", "n", "", "CONT", "Al recibir reporte", "mayor es mejor", "No", ""),
    ("NICSP_EXCL", "Cumplimiento", "Cumplimiento", "Brechas NICSP excluidas", "n", "", "CONT", "Al recibir reporte", "mayor es mejor", "No", ""),
    ("NICSP_PEND", "Cumplimiento", "Cumplimiento", "Brechas NICSP pendientes", "n", "", "CONT", "Al recibir reporte", "menor es mejor", "Sí", "NICSP_IDENT − NICSP_IMPL − NICSP_EXCL"),
    ("SUNAFIL_PCT", "Cumplimiento", "Cumplimiento", "% de observaciones SUNAFIL levantadas", "%", "", "SST", "Al recibir reporte", "mayor es mejor", "No", ""),
    ("EMO", "Cumplimiento", "Bienestar", "Trabajadores con examen médico ocupacional (EMO)", "n", "", "SST", "Anual", "mayor es mejor", "No", ""),
    ("SEG_PERSONAL", "Cumplimiento", "Gestión institucional", "Personal de seguridad", "n", "", "SEG", "Al cambiar", "mayor es mejor", "No", ""),
    ("SEG_SEDES", "Cumplimiento", "Gestión institucional", "Sedes judiciales a cubrir con seguridad", "n", "", "SEG", "Al cambiar", "mayor es mejor", "No", ""),
]


def fila(ind, anio, valor, sustento, corte="", periodo="", parcial="No", estado="validado", obs="", sede=""):
    return (ind, anio, d(corte), periodo, parcial, sede, valor, sustento, estado, obs, CARGA)


SIN_CORTE = "El informe dice «a la fecha» sin indicar el día (ver VALIDACIONES V14)."
DATA = [
    # Presupuesto (p. 10-11)
    fila("PPTO_PIA", 2025, 95011538, pag(10, "cuadro PIA/PIM por genérica"), "31/12/2025", "ene–dic"),
    fila("PPTO_PIM", 2025, 101234316, pag(10, "texto de ejecución y consulta SIAF 06-ene-2026"), "31/12/2025", "ene–dic",
         estado="por validar", obs="El texto del PIA 2025 dice S/ 101,849,953 (V01)."),
    fila("PPTO_DEV", 2025, 101118115, pag(10, "consulta SIAF 06-ene-2026"), "31/12/2025", "ene–dic"),
    fila("PPTO_PUESTO", 2025, 14, pag(10), "31/12/2025", "ene–dic"),
    fila("PPTO_PIA", 2026, 100425575, pag(11), "30/09/2026", "ene–set", "Sí"),
    fila("PPTO_PIM", 2026, 101849953, pag(10, "avance de ejecución 2026"), "30/09/2026", "ene–set", "Sí",
         estado="por validar", obs="La p. 11 dice S/ 101,848,384 (V02)."),
    fila("PPTO_DEV", 2026, 71821760, pag(10), "30/09/2026", "ene–set", "Sí"),
    fila("PPTO_PUESTO", 2026, 9, pag(10), "30/09/2026", "ene–set", "Sí"),
    # Multas (p. 8)
    fila("MULTAS", 2024, 336998.13, pag(8), "31/12/2024", "ene 2023–dic 2024 (24 meses)",
         estado="por validar", obs="Monto del bienio 2023-2024; se compara con 21 meses de 2025-2026 (V07)."),
    fila("MULTAS", 2025, 177590.29, pag(8, "gráfico 2025 y 2026"), "31/12/2025", "ene–dic"),
    fila("MULTAS", 2026, 174012.13, pag(8, "gráfico 2025 y 2026"), "30/09/2026", "ene–set", "Sí"),
    # Archivo (p. 42)
    fila("ARCH_ATENC", 2025, 7646, pag(42), "31/12/2025", "ene–dic"),
    fila("ARCH_ATENC", 2026, 5299, pag(42), "", "ene–oct", "Sí", obs=SIN_CORTE),
    fila("ARCH_RECAUDA", 2025, 53567.30, pag(42), "31/12/2025", "ene–dic"),
    fila("ARCH_RECAUDA", 2026, 42480.50, pag(42), "", "ene–oct", "Sí", estado="por validar",
         obs="El informe dice que es el 81% de 2025; el cálculo da 79.3% y compara ene–oct con ene–dic (V06)."),
    # Estadística (p. 31, 34)
    fila("JORN_ACTOS", 2025, 70269, pag(31), "", "jornadas del 06/06 y 22/08", estado="por validar",
         obs="Las fechas de las jornadas 2025 están escritas como 2026 (V08)."),
    fila("JORN_ACTOS", 2026, 74846, pag(34), "14/08/2026", "jornadas del 12/06 y 14/08", "Sí",
         obs="Hay otra jornada programada para el 13/11/2026."),
    fila("EXP_REMITIDOS", 2025, 4917, pag(31), "", "jornadas 2025", estado="por validar", obs="Ver V08."),
    fila("EXP_REMITIDOS", 2026, 6210, pag(34, "382 paquetes, archivo definitivo"), "14/08/2026", "jornadas 2026", "Sí"),
    fila("EXP_DEVUELTOS", 2025, 449, pag(31), "", "jornadas 2025", estado="por validar", obs="Ver V08."),
    fila("EXP_DEVUELTOS", 2026, 1199, pag(34), "14/08/2026", "jornadas 2026", "Sí"),
    fila("CAP_SIJ", 2025, 60, pag(31), "31/12/2025", "ene–dic"),
    fila("CAP_SIJ", 2026, 50, pag(34), "", "a la fecha", "Sí", obs=SIN_CORTE),
    fila("CAP_SIJ_SERV", 2025, 675, pag(31), "31/12/2025", "ene–dic"),
    fila("CAP_SIJ_SERV", 2026, 216, pag(34), "", "a la fecha", "Sí", obs=SIN_CORTE),
    # Módulo de Violencia (p. 43)
    fila("VIO_RESUELTOS", 2025, 3301, pag(43, "formato de seguimiento POI 2025"), "31/12/2025", "ene–dic"),
    fila("VIO_META", 2025, 100.4, pag(43, "formato de seguimiento POI 2025"), "31/12/2025", "ene–dic"),
    # UDAJUP (p. 3-5)
    fila("JP_YACHAY", 2025, 14, pag(3, "R.A. N° 001418-2025-P-CSJJU-PJ, plan piloto"), "31/12/2025", "ene–dic",
         estado="por validar", obs="Nombre del aplicativo: YACHAY 2.0 / SISJUPAZ 2.0 (V09)."),
    fila("JP_YACHAY", 2026, 92, pag(3, "R.A. N° 000731-2026-P-CSJJU-PJ, migración total"), "", "a la fecha", "Sí",
         estado="por validar", obs="Ver V09. " + SIN_CORTE),
    fila("JP_CAP_VIRT", 2025, 21, pag(4, "R.A. N° 0094-2025-P-CSJJU-PJ"), "31/12/2025", "ene–dic"),
    fila("JP_CAP_NAC", 2025, 5, pag(4), "31/12/2025", "ene–dic"),
    fila("JP_CAP_ENC", 2025, 1, pag(4), "31/12/2025", "ene–dic"),
    fila("JP_CAP_YACHAY", 2025, 3, pag(4), "31/12/2025", "ene–dic"),
    fila("JP_CAP_SISJUPAZ", 2025, 6, pag(4), "31/12/2025", "ene–dic"),
    fila("JP_CAP_VIRT", 2026, 13, pag(4, "R.A. N° 000127-2026-P-CSJJU-PJ"), "", "a la fecha", "Sí", obs=SIN_CORTE),
    fila("JP_CAP_PRES", 2026, 9, pag(4, "R.A. N° 000127-2026-P-CSJJU-PJ"), "", "a la fecha", "Sí", obs=SIN_CORTE),
    fila("JP_VISITAS", 2025, 58, pag(5), "31/12/2025", "ene–dic"),
    fila("JP_VISITAS", 2026, 48, pag(5), "", "a la fecha", "Sí", obs=SIN_CORTE),
    # REDIJU (p. 9)
    fila("RCBP", 2023, 32063, pag(9), "31/12/2023", "ene–dic"),
    fila("RCBP", 2024, 34066, pag(9), "31/12/2024", "ene–dic"),
    fila("RCBP", 2025, 37289, pag(9), "31/12/2025", "ene–dic"),
    fila("RCBP", 2026, 66048, pag(9), "15/05/2026", "ene–15 may", "Sí", estado="por validar",
         obs="Casi duplica todo 2025; puede ser un acumulado (V03)."),
    fila("RENAVINA", 2023, 89, pag(9), "31/12/2023", "ene–dic"),
    fila("RENAVINA", 2024, 59, pag(9), "31/12/2024", "ene–dic"),
    fila("RENAVINA", 2025, 34, pag(9), "31/12/2025", "ene–dic"),
    fila("RENAVINA", 2026, 24, pag(9), "15/05/2026", "ene–15 may", "Sí"),
    # Informática (p. 24)
    fila("CURIA_USU", 2026, 505, pag(24), "", "a la fecha", "Sí", obs=SIN_CORTE),
    # Contabilidad (p. 39)
    fila("NICSP_IDENT", 2026, 47, pag(39, "diagnóstico inicial"), "", "a la fecha", obs=SIN_CORTE),
    fila("NICSP_IMPL", 2026, 25, pag(39), "", "a la fecha", obs=SIN_CORTE),
    fila("NICSP_EXCL", 2026, 19, pag(39), "", "a la fecha", obs=SIN_CORTE),
    # SST (p. 56-57) y Seguridad (p. 62)
    fila("SUNAFIL_PCT", 2026, 95, pag(56), "", "a la fecha", obs="Año y fecha de corte no indicados (V14)."),
    fila("EMO", 2024, 68, pag(57), "31/12/2024", "ene–dic"),
    fila("EMO", 2025, 210, pag(57), "31/12/2025", "ene–dic"),
    fila("SEG_PERSONAL", 2026, 59, pag(62), "", "a la fecha", obs="Sin desglose por sede (V17). " + SIN_CORTE),
    fila("SEG_SEDES", 2026, 24, pag(62), "", "a la fecha", obs=SIN_CORTE),
]

PRESUPUESTO = [
    (2025, d("31/12/2025"), "2.1 Personal y obligaciones sociales", 83051673, 89040252, None),
    (2025, d("31/12/2025"), "2.3 Bienes y servicios", 11948165, 10369776, None),
    (2025, d("31/12/2025"), "2.5 Otros gastos", 11700, 13156, None),
    (2025, d("31/12/2025"), "2.6 Adquisición de activos no financieros", None, 1811132, None),
]

INVERSIONES = [
    (2697358, "Adquisición de hardware general; en veintiocho a nivel departamental (Junín)", "Juzgados no penales",
     d("11/06/2025"), 710810.88, 564790.00, 564789.09, None, "cerrada", d("19/01/2026"),
     pag(25, "Formato N° 09 – Registro de cierre de inversión")),
    (2697592, "Adquisición de mobiliario de oficina, hardware general, sistema de audio y video y equipo de identificación "
              "biométrica; Juzgado Permanente Especializado en Extinción de Dominio, El Tambo", "Juzgado de Extinción de Dominio",
     d("13/06/2025"), 176060.00, 176997.87, 176997.87, None, "cerrada", d("02/12/2025"),
     pag(25, "Formato N° 09 – Registro de cierre de inversión")),
    (2735418, "Adquisición de hardware general, storage, servidor y switch y otros activos; Unidad de Flagrancia Delictiva",
     "Unidad de Flagrancia Delictiva", d("24/07/2026"), None, None, 0, 242960.00, "activa", d("21/09/2026"),
     pag(26, "Formato N° 12-B; costo solo como «2.4 MM» (V10)")),
]

EQUIPAMIENTO = [
    ("EQ01", 2025, "Juzgados no penales", "", 2697358, "Computadora de escritorio", 74, None, pag(25)),
    ("EQ02", 2025, "Juzgados no penales", "", 2697358, "Computadora portátil", 14, None, pag(25)),
    ("EQ03", 2025, "Juzgados no penales", "", 2697358, "Impresora", 26, None, pag(25)),
    ("EQ04", 2025, "Juzgado de Extinción de Dominio", "HYO-TAM", 2697592, "Computadora de escritorio", 10, None, pag(25)),
    ("EQ05", 2025, "Juzgado de Extinción de Dominio", "HYO-TAM", 2697592, "Escáner", 3, None, pag(25)),
    ("EQ06", 2025, "Juzgado de Extinción de Dominio", "HYO-TAM", 2697592, "Impresora", 7, None, pag(25)),
    ("EQ07", 2025, "Juzgado de Extinción de Dominio", "HYO-TAM", 2697592, "Sistema de audio y video", 1, None, pag(25)),
    ("EQ08", None, "Módulo de Violencia y juzgados SNEJ", "", None, "Computadora de escritorio", 16, None, pag(43, "Acuerdo Marco; año no indicado")),
    ("EQ09", None, "Módulo de Violencia (Sede Central)", "HYO-CEN", None, "Switch de red", 2, 257700.00, pag(44, "año no indicado")),
    ("EQ10", None, "1° y 2° Juzgado Penal Colegiado Transitorio", "", None, "Escáner", 3, None, pag(44, "año no indicado")),
    ("EQ11", None, "Módulo de Violencia", "", None, "Cámara web", 21, None, pag(45, "año no indicado")),
    ("EQ12", None, "Módulo de Violencia", "", None, "UPS", 16, None, pag(45, "año no indicado")),
    ("EQ13", None, "Centro de datos del Módulo Penal", "", None, "Servidor FTP", 1, None, pag(22, "año no indicado")),
    ("EQ14", None, "Data center de la Sede Central", "HYO-CEN", None, "Switch SAN", 2, None, pag(23, "año no indicado")),
]

OS_PLUVIAL = "OS N° 00171, 00333, 00335, 00336, 00337 y 00424-2026 (sin asignar por sede, V16)"
OBRAS = [
    ("OB01", "YAU-SUB", 2025, "Acondicionamiento del comedor y mantenimiento de la cobertura e infraestructura", "mantenimiento",
     None, None, None, "ejecutada", "OS N° 00074-2025-S; ITC N° 004-2025-OI-UAF-GAD-CSJJU", d("17/03/2025")),
    ("OB02", "CON-MBJ", 2025, "Adecuación para la Cámara Gesell del Módulo del NCPP", "adecuación",
     None, None, None, "ejecutada", "Contrato N° 019-2025-GAD-CSJJU/P; OS N° 00581-2025-S; ITC N° 092-2025-OI-UAF-GAD-CSJJU", d("30/12/2025")),
    ("OB03", "TAR-MBJ", 2026, "Mantenimiento y adecuación del pool del personal jurisdiccional", "adecuación",
     None, None, None, None, "", None),
    ("OB04", "CON-MBJ", 2026, "Mantenimiento y adecuación del pool del personal jurisdiccional y de la Administración", "adecuación",
     None, None, None, "ejecutada", "Contrato N° 004-2026-GAD-CSJJU/PJ; SIAF 0489-2026-S; ITC N° 052-2026-OI-UAF-GAD-CSJJU", d("03/08/2026")),
    ("OB05", "TAY-MBJ", 2026, "Ampliación del archivo modular y sala de lectura del Módulo del NCPP", "ampliación",
     22.06, 56.60, None, "ejecutada", "Contrato N° 007-2026-GAD-CSJJU/PJ; SIAF 0765-2026-S; ITC N° 064-2026-OI-UAF-GAD-CSJJU", d("09/09/2026")),
    ("OB06", "TAY-MBJ", 2026, "Ampliación del ambiente del personal de notificaciones", "ampliación",
     13.00, 18.00, None, "ejecutada", "Contrato N° 007-2026-GAD-CSJJU/PJ; SIAF 0765-2026-S; ITC N° 064-2026-OI-UAF-GAD-CSJJU", d("09/09/2026")),
    ("OB07", "HYO-CAJ", 2026, "Mantenimiento de coberturas y evacuación pluvial", "mantenimiento", None, None, None, None, OS_PLUVIAL, None),
    ("OB08", "HYO-ALM", 2026, "Mantenimiento de coberturas y evacuación pluvial", "mantenimiento", None, None, None, None, OS_PLUVIAL, None),
    ("OB09", "HYO-ARI", 2026, "Mantenimiento de coberturas y evacuación pluvial", "mantenimiento", None, None, None, None, OS_PLUVIAL, None),
    ("OB10", "HYO-ARH", 2026, "Mantenimiento de coberturas y evacuación pluvial", "mantenimiento", None, None, None, None, OS_PLUVIAL, None),
    ("OB11", "YAU-SUB", 2026, "Mantenimiento de coberturas y evacuación pluvial", "mantenimiento", None, None, None, None, OS_PLUVIAL, None),
    ("OB12", "CON-MBJ", 2026, "Mantenimiento de coberturas y evacuación pluvial (priorizada por el FEN)", "mantenimiento", None, None, None, "en curso", OS_PLUVIAL, None),
    ("OB13", "HYO-JPL", 2026, "Mantenimiento de coberturas y evacuación pluvial (priorizada por el FEN)", "mantenimiento", None, None, None, "en curso", OS_PLUVIAL, None),
    ("OB14", "TAY-MBJ", None, "Construcción de la Cámara Gesell (audio, video, cómputo y mobiliario)", "nueva infraestructura", None, None, None, None, "", None),
    ("OB15", "HYO-CUS", None, "Redistribución de las salas 01 y 02 del primer piso para la Unidad de Flagrancia", "adecuación", None, None, None, None, "", None),
]

PATRIMONIO = [
    ("PA01", 2025, "baja RAEE", 82, "R.A. N° 686-2025-UAF-GAD-CSJJU-PJ", d("10/12/2025"), ""),
    ("PA02", 2025, "baja RAEE", 295, "R.A. N° 723-2025-UAF-GAD-CSJJU-PJ", d("19/12/2025"), ""),
    ("PA03", 2026, "donación", 377, "R.A. N° 000034-2026-UAF-GAD-CSJJU-PJ", d("22/01/2026"), "TECNORENEW EIRL (RUC 20614078066)"),
    ("PA04", 2026, "reposición", 11, "", None, "Sede Chupaca – póliza MAPFRE (siniestro del 25/03/2026)"),
    ("PA05", 2026, "transferencia", 113, "R.A. N° 000534-2026-UAF-GAD-CSJJU-PJ", d("21/08/2026"), "UE Autoridad Nacional de Control (ANC)"),
    ("PA06", 2026, "baja RAEE", 913, "R.A. N° 000553-2026-UAF-GAD-CSJJU-PJ", d("28/08/2026"), ""),
    ("PA07", 2026, "donación", 913, "R.A. N° 000646-2026-UAF-GAD-CSJJU-PJ", d("25/09/2026"), "ECO TECNO E.I.R.L. (RUC 20611143436)"),
]


def iv(id_, of, eje, anio, titulo, brecha, solucion, sustento, estado="concluida"):
    return (id_, of, eje, anio, titulo, brecha, solucion, sustento, estado)


INTERVENCIONES = [
    iv("IN01", "UFI", "Cumplimiento", 2026, "Implementación del Modelo de Integridad (Guías 1 y 2)", "Brechas en los criterios del Modelo de Integridad",
       "Coordinación con las áreas, revisión de actuaciones y medios de verificación", pag(2), "en curso"),
    iv("IN02", "UDAJUP", "Digital", 2026, "Aplicativo YACHAY 2.0 / SISJUPAZ 2.0 en juzgados de paz", "Plataforma anterior básica con riesgos de seguridad",
       "Implementación oficial y obligatoria: 14 juzgados piloto (2025) y 92 (2026)", pag(3, "R.A. 001418-2025 y 000731-2026-P-CSJJU-PJ")),
    iv("IN03", "UDAJUP", "Capacitación", 2026, "Plan anual de capacitación a jueces y juezas de paz", "Distancia y conectividad limitada de los jueces de paz",
       "Cursos y jornadas presenciales y virtuales (Google Meet)", pag(4, "R.A. 0094-2025 y 000127-2026-P-CSJJU-PJ"), "en curso"),
    iv("IN04", "UDAJUP", "Supervisión", 2026, "Visitas administrativas a jueces y juezas de paz", "Falta de supervisión permanente del archivo de los juzgados de paz",
       "Visitas de control preventivo y asesoría: 58 (2025) y 48 (2026)", pag(5), "en curso"),
    iv("IN05", "UDAJUP", "Acceso a la justicia", 2026, "Delimitación de la competencia territorial de juzgados de paz", "Límites territoriales no identificados",
       "Reuniones y jornadas técnico-legales para fijar el ámbito de cada juzgado", pag(6), "en curso"),
    iv("IN06", "UDAJUP", "Acceso a la justicia", 2025, "Donación de kits con material didáctico para espacios de contención infantil", "Entorno revictimizante para menores en diligencias de violencia",
       "Espacios de contención infantil en los despachos", pag(7, "R.A. N° 001566-2025-P-CSJJU-PJ")),
    iv("IN07", "SECOM", "Recaudación", 2026, "Recaudación de multas judiciales", "Déficit de recaudación 2023-2024 (S/ 336,998.13)",
       "Incremento de la recaudación 2025-2026 (S/ 351,602.42 a setiembre 2026)", pag(8), "en curso"),
    iv("IN08", "REDIJU", "Supervisión", 2026, "Control biométrico RCBP-RCVP y RENAVINA", "", "Tercer lugar nacional en el ranking RCBP", pag(9)),
    iv("IN09", "PPTO", "Gestión institucional", 2026, "Aplicativo que procesa la información presupuestaria del SIAF-MEF", "",
       "Reportes automáticos en Excel del avance de la ejecución", pag(11)),
    iv("IN10", "RRHH", "Digital", 2026, "Constancia de trabajo por el Sistema Integrado de Apoyo", "Demora y pérdida de FUT físicos",
       "Registro y seguimiento de solicitudes en el sistema", pag(12)),
    iv("IN11", "RRHH", "Digital", 2026, "Digitalización del legajo personal", "Documentos difíciles de ubicar y riesgo de pérdida",
       "Documentos digitalizados en el SIGA y visibles para cada servidor", pag(13), "en curso"),
    iv("IN12", "RRHH", "Bienestar", 2025, "Reactivación del Wawa Wasi «Mi pequeño Angelito Judicial»", "", "Servicio reactivado en agosto de 2025 con 9 niños y niñas inscritos", pag(14)),
    iv("IN13", "RRHH", "Bienestar", 2026, "Comedores de los módulos de Violencia Integral y Violencia Penal Sanción", "", "Comedores implementados según convenio colectivo", pag(14)),
    iv("IN14", "RRHH", "Bienestar", 2026, "Primera Feria del Niño", "", "Evento para los hijos de los servidores (agosto 2026)", pag(14)),
    iv("IN15", "RRHH", "Gestión institucional", 2026, "Programa de Voluntariado Judicial 2026-I y 2026-II", "Carga de trabajo mayor a la capacidad operativa",
       "Incorporación de voluntarios en dependencias y áreas", pag(15)),
    iv("IN16", "INFRA", "Infraestructura", 2025, "Comedor y cobertura de la subsede de Yauli – La Oroya", "Condiciones de confort y coberturas deterioradas", "Ver obra OB01", pag(16)),
    iv("IN17", "INFRA", "Infraestructura", 2025, "Cámara Gesell del MBJ de Concepción", "Sin ambientes para entrevistas sin revictimización", "Ver obra OB02", pag(17)),
    iv("IN18", "INFRA", "Infraestructura", 2026, "Pool del personal jurisdiccional – MBJ Tarma y Concepción", "Distribución inadecuada, riesgo eléctrico y pisos dañados", "Ver obras OB03 y OB04", pag(18, "y p. 19 y 55")),
    iv("IN19", "INFRA", "Infraestructura", 2026, "Ampliación del archivo modular y notificaciones – MBJ Pampas", "Espacio insuficiente para archivo y notificaciones", "Ver obras OB05 y OB06", pag(20)),
    iv("IN20", "INFRA", "Infraestructura", 2026, "Mantenimiento pluvial y de coberturas en sedes y subsedes", "Riesgo de filtraciones (temporada de lluvias y Fenómeno El Niño)", "Ver obras OB07 a OB13", pag(21), "en curso"),
    iv("IN21", "MLAB", "Digital", 2025, "Aplicativo RAPIDEMANDA (demandas laborales hasta 70 URP)", "Demora en la calificación de demandas laborales",
       "Medio oficial de presentación ante el JPL Laboral de Huancayo", pag(47, "R.A. N° 1669-2025-P-CSJJU-PJ; también p. 22")),
    iv("IN22", "INFO", "Equipamiento", None, "Servidor FTP para el centro de datos del Módulo Penal", "Sin espacio para actas y videos de audiencias", "Ver EQ13", pag(22)),
    iv("IN23", "INFO", "Equipamiento", None, "Dos switches SAN para el data center de la Sede Central", "Lentitud del SIJ", "Ver EQ14", pag(23)),
    iv("IN24", "INFO", "Digital", None, "Aplicativo SATIC de atenciones de TI", "Sin trazabilidad de las atenciones de soporte", "Estadística de atenciones por sede", pag(23)),
    iv("IN25", "INFO", "Digital", 2026, "Transferencia tecnológica del aplicativo CURIA (IA generativa)", "Capacidades en herramientas de IA", "505 usuarios habilitados; lanzamiento el 13/10/2026", pag(24), "en curso"),
    iv("IN26", "INFO", "Capacitación", 2026, "Ciclo de capacitaciones en inteligencia artificial", "Capacidades en herramientas de IA", "Gemini, NotebookLM y CURIA para jueces y personal", pag(24)),
    iv("IN27", "EPR", "Equipamiento", 2025, "IOARR CUI 2697358 – equipos para juzgados no penales", "Equipos insuficientes u obsoletos", "114 equipos informáticos", pag(25)),
    iv("IN28", "EPR", "Equipamiento", 2025, "IOARR CUI 2697592 – Juzgado de Extinción de Dominio", "Equipamiento y mobiliario limitados", "Equipos informáticos, audiovisuales y mobiliario", pag(25)),
    iv("IN29", "EPR", "Equipamiento", 2026, "IOARR CUI 2735418 – Unidad de Flagrancia Delictiva", "Equipos, mobiliario y vehículos para la unidad", "En ejecución; programado S/ 242,960.00 en 2026", pag(26), "en curso"),
    iv("IN30", "EPR", "Gestión institucional", 2026, "Prórroga, conversión, asignación e itinerancia de órganos jurisdiccionales", "Alta carga procesal en algunas especialidades",
       "R.A. 284, 310, 323, 290, 126 y 171-2026-CE-PJ", pag(26, "y p. 27")),
    iv("IN31", "EPR", "Convenios", 2026, "Gestión y seguimiento de convenios interinstitucionales", "Débil articulación interinstitucional", "17 entidades con convenio o adenda vigente", pag(28, "a p. 30"), "en curso"),
    iv("IN32", "EST", "Producción", 2025, "Jornadas judiciales extraordinarias y Equipo de Descarga Itinerante 2025", "Descongestión procesal", "70,269 actos procesales", pag(31)),
    iv("IN33", "EST", "Producción", 2026, "Jornadas judiciales extraordinarias y Equipo de Descarga Itinerante 2026", "Descongestión procesal", "74,846 actos procesales; nueva jornada el 13/11/2026", pag(34), "en curso"),
    iv("IN34", "EST", "Digital", 2026, "Dashboards estadísticos con información del SIJ y SIE-PJ", "Falta de información consolidada", "Seguimiento de escritos, carga e inactividad procesal", pag(34)),
    iv("IN35", "EST", "Supervisión", 2026, "Ranking mensual de producción de los 101 órganos jurisdiccionales", "Seguimiento de metas de producción", "Difusión mensual de información estadística", pag(32)),
    iv("IN36", "OCP", "Patrimonio", 2026, "Disposición final de bienes RAEE y transferencias", "", "Ver hoja PATRIMONIO", pag(35, "a p. 37")),
    iv("IN37", "OCP", "Patrimonio", 2026, "Inventario físico de bienes patrimoniales 2025", "", "Presentado en SINABIP Web (16/03/2026)", pag(35)),
    iv("IN38", "OCP", "Patrimonio", 2026, "Saneamiento administrativo de bienes muebles del inventario 2025", "", "En revisión para la conformidad", pag(35, "OS N° 384, SIAF N° 910"), "en curso"),
    iv("IN39", "OCP", "Digital", 2026, "Sistema de Gestión Patrimonial SIGEPAT-CSJJU", "", "Operativo; declaración jurada de posesión de bienes", pag(38, "R.A. N° 002072-2026-P-CSJJU-PJ")),
    iv("IN40", "CONT", "Cumplimiento", 2026, "Programa de transición al Marco de las NICSP", "47 brechas contables", "25 implementadas, 19 excluidas y 3 pendientes", pag(39), "en curso"),
    iv("IN41", "ARCH", "Gestión institucional", 2025, "Eliminación de documentos (1941-2024), 80.47 metros lineales", "", "Entregado al Archivo Regional el 19/12/2025", pag(40, "R.D. N° 016-2025-GRJ/AR")),
    iv("IN42", "ARCH", "Gestión institucional", 2026, "Transferencia de 240 paquetes de expedientes de más de 30 años (33.38 m.l.)", "", "Acta N° 001-2026-CED-CSJJU-PJ (18/05/2026)", pag(41)),
    iv("IN43", "ARCH", "Infraestructura", 2026, "Habilitación de contenedor para expedientes disciplinarios de la ODANC", "Repositorios congestionados", "1,200 paquetes en unos 480 metros lineales", pag(42)),
    iv("IN44", "MVIO", "Producción", 2025, "Superación de la meta de producción del Módulo de Violencia", "", "3,301 expedientes resueltos (100.4% de la meta)", pag(43)),
    iv("IN45", "MVIO", "Equipamiento", None, "Computadoras, doble monitor, switches, escáneres, cámaras web y UPS", "", "Ver EQ08 a EQ12", pag(43, "a p. 45")),
    iv("IN46", "MVIO", "Capacitación", 2025, "Cuatro cursos de capacitación penal y multidisciplinaria", "", "R.A. N° 154-2025-GG-PJ (PDP 2025)", pag(44)),
    iv("IN47", "MPEN", "Gestión institucional", None, "Reubicación del Juzgado Transitorio de Extinción de Dominio y coordinación multisectorial", "Audiencias frustradas por inasistencias", "Coordinación con Fiscalía y Defensa Pública", pag(46)),
    iv("IN48", "MLAB", "Digital", 2026, "Contestación de demandas por código QR", "", "Desde el 18/08/2026", pag(47)),
    iv("IN49", "MLAB", "Gestión institucional", 2026, "Revista Laboral VIII edición", "", "Publicación anual", pag(47)),
    iv("IN50", "MLAB", "Digital", 2025, "Ampliación del EJE y la Mesa de Partes Electrónica (NLPT) en 8 sedes", "", "Desde el 15/12/2025", pag(48, "R.A. N° 451-2025-CE-PJ")),
    iv("IN51", "MLAB", "Capacitación", 2026, "Capacitaciones en EJE y en temas periciales en siete provincias", "", "", pag(49)),
    iv("IN52", "ADM-TAR", "Acceso a la justicia", 2026, "Ferias itinerantes informativas en Tarma", "Falta de orientación jurídica gratuita", "", pag(50)),
    iv("IN53", "ADM-TAR", "Acceso a la justicia", 2026, "Despachos presidenciales y reuniones multisectoriales en Tarma", "", "", pag(51)),
    iv("IN54", "ADM-PAM", "Infraestructura", None, "Cámara Gesell, renovación de computadoras y ambientes en el MBJ de Pampas", "", "Ver obra OB14", pag(52)),
    iv("IN55", "ADM-CHU", "Equipamiento", None, "Renovación de computadoras y empotrados de melamina en la sede Chupaca", "", "", pag(53)),
    iv("IN56", "ADM-JAU", "Digital", None, "Hoja compartida con el MINJUS para asignar defensores públicos", "Demora en el inicio de audiencias virtuales", "", pag(54)),
    iv("IN57", "SST", "Cumplimiento", 2026, "Levantamiento de observaciones de SUNAFIL", "Observaciones y brechas documentarias en SST", "95% de observaciones levantadas", pag(56)),
    iv("IN58", "SST", "Bienestar", 2025, "Ampliación de la cobertura de exámenes médico ocupacionales", "", "De 68 (2024) a 210 (2025) trabajadores", pag(57)),
    iv("IN59", "SST", "Bienestar", 2026, "Programas de salud ocupacional, gestantes, integración, jubilación y riesgos psicosociales", "", "Incluye evaluación de clima laboral con la Universidad Continental", pag(57, "a p. 61"), "en curso"),
    iv("IN60", "SEG", "Gestión institucional", 2026, "Reordenamiento del personal de seguridad y CCTV remoto", "59 agentes para 24 sedes", "Fusión para 4 plazas de S/ 1,950", pag(62), "en curso"),
    iv("IN61", "FLAG", "Acceso a la justicia", 2026, "Implementación de la Unidad Piloto de Flagrancia Delictiva y «Ruta de la Flagrancia»", "", "Con PNP, Fiscalía y Defensa Pública", pag(63, "y p. 64"), "en curso"),
]

CONVENIOS = [
    ("CV01", "Municipalidad Distrital de San Agustín de Cajas", "Adenda N° 003", "Ampliar compromisos y vigencia del convenio de cooperación", d("15/09/2030"), "No"),
    ("CV02", "Municipalidad Provincial de Tayacaja", "Adenda N° 001", "Cesión de un ambiente para el Archivo Descentralizado del MBJ de Pampas", d("28/04/2032"), "No"),
    ("CV03", "INPE", "Adenda N° 001 al Convenio Específico N° 010", "Acceso a información de expedientes de internos y módulos de consulta en el penal de Huancayo", d("22/07/2027"), "No"),
    ("CV04", "Municipalidad Distrital de Tapo", "Adenda N° 001", "Apoyo a la Comisión de Acceso a la Justicia", d("21/11/2030"), "Sí"),
    ("CV05", "Gobierno Regional de Junín", "Adenda N° 001 al Convenio Específico N° 003", "Mecanismos de coordinación para la seguridad jurídica", d("17/03/2027"), "No"),
    ("CV06", "Gobierno Regional de Junín", "Convenio Específico N° 005", "Capacitación y promoción de derechos en legislación laboral", d("01/04/2027"), "No"),
    ("CV07", "INPE", "Adenda N° 001 al Convenio Específico N° 011", "Validación de documentos y resoluciones mediante el Sistema Integrado Penitenciario", d("22/07/2027"), "No"),
    ("CV08", "Universidad Continental – Facultad de Psicología", "Adenda N° 001", "Higiene mental y clima organizacional (charlas y talleres)", d("25/10/2027"), "Sí"),
    ("CV09", "Colegio de Abogados de Junín", "Convenio Marco", "Seguridad jurídica y convenios específicos", d("17/03/2030"), "Sí"),
    ("CV10", "Colegio de Abogados de Junín", "Convenio Específico N° 001", "Congresos, cursos y talleres de capacitación", d("17/03/2027"), "No"),
    ("CV11", "Universidad Peruana Los Andes – UPLA", "Convenio Marco", "Cooperación mutua y cumplimiento de fines institucionales", d("04/04/2030"), "Sí"),
    ("CV12", "Universidad Privada de Huancayo Franklin Roosevelt", "Convenio de Cooperación Interinstitucional", "Actividades académicas y capacitación conjunta", d("28/05/2027"), "No"),
    ("CV13", "Universidad Continental", "Convenio Específico N° 002", "Actividades académicas y capacitación conjunta", d("04/07/2027"), "No"),
    ("CV14", "Arzobispado de Huancayo", "Convenio de Cooperación Interinstitucional", "Uso del auditorio «Nuestra Señora del Valle»", d("07/07/2027"), "No"),
    ("CV15", "Colegio de Notarios de Junín", "Convenio Marco", "Fortalecer la prestación de servicios públicos", d("20/08/2030"), "Sí"),
    ("CV16", "Dirección Regional de Salud de Junín", "Adenda N° 001", "Salud mental de víctimas de violencia con el aplicativo Paykuna", d("15/03/2029"), "No"),
    ("CV17", "Municipalidad Distrital de Chilca", "Convenio Marco", "Seguridad jurídica y convenios específicos", d("20/03/2031"), "Sí"),
    ("CV18", "Municipalidad Distrital de Chilca", "Convenio Específico N° 001", "Actividades académicas y de capacitación", d("27/03/2028"), "No"),
    ("CV19", "Centro Psicológico y Psiquiátrico Excelentemente E.I.R.L.", "Convenio", "Salud mental, bienestar emocional y riesgos psicosociales", d("07/08/2028"), "No"),
]

SET26 = d("01/09/2026")  # el informe solo dice septiembre
INTEGRIDAD = [(SET26, c, 1, 96.9) for c in ["Unidad de Integridad", "CSJ La Libertad", "CSJ Huaura", "CSJ Arequipa", "CSJ Callao",
                                              "CSJ Junín", "CSJ Áncash", "CSJ Huánuco", "CSJ Lima Norte"]] + [
    (SET26, "Unidad de Integridad", 2, 80.6), (SET26, "CSJ La Libertad", 2, 71.3), (SET26, "CSJ Huaura", 2, 67.6),
    (SET26, "CSJ Arequipa", 2, 49.1), (SET26, "CSJ Callao", 2, 38.0), (SET26, "CSJ Junín", 2, 22.2)]


def vl(id_, hoja, clave, tema, dice, obs, of):
    return (id_, hoja, clave, tema, dice, obs, of, "por validar", None)


VALIDACIONES = [
    vl("V01", "DATA_INDICADORES", "PPTO_PIM|2025", "PIM 2025", "Texto: S/ 101,849,953; tabla: S/ 101,234,316",
       "La primera cifra es el PIM 2026. Se cargó S/ 101,234,316 (tabla SIAF)", "PPTO"),
    vl("V02", "DATA_INDICADORES", "PPTO_PIM|2026", "PIM 2026", "S/ 101,849,953 (p. 10) y S/ 101,848,384 (p. 11)",
       "Diferencia de S/ 1,569. Se cargó S/ 101,849,953", "PPTO"),
    vl("V03", "DATA_INDICADORES", "RCBP|2026", "RCBP 2026", "66,048 al 15/05/2026", "Casi duplica todo 2025 (37,289); puede ser un acumulado", "REDIJU"),
    vl("V04", "PATRIMONIO", "PA06 / PA07", "Bajas RAEE", "«Novecientos tres (913)»", "Letras y número no coinciden; el desglose suma 331 (91+74+26+14+79+47)", "OCP"),
    vl("V05", "PATRIMONIO", "PA04", "Reposición por seguro", "11 bienes", "Solo se detallan 5 CPU y 1 UPS; no se indica la resolución", "OCP"),
    vl("V06", "DATA_INDICADORES", "ARCH_RECAUDA|2026", "Recaudación del archivo", "2026 = 81% de 2025",
       "El cálculo da 79.3% y compara ene–oct 2026 con ene–dic 2025", "ARCH"),
    vl("V07", "DATA_INDICADORES", "MULTAS", "Multas", "2023–2024 vs. 2025–2026", "24 meses contra 21 meses (2026 llega a setiembre)", "SECOM"),
    vl("V08", "DATA_INDICADORES", "JORN_ACTOS|2025", "Jornadas 2025", "Fechas escritas como 2026 (06/06 y 22/08/2026)", "Error de digitación probable; falta la fecha de corte", "EST"),
    vl("V09", "DATA_INDICADORES", "JP_YACHAY", "YACHAY / SISJUPAZ", "El título dice SISJUPAZ 2.0 y el texto YACHAY 2.0", "Unificar el nombre del aplicativo", "UDAJUP"),
    vl("V10", "INVERSIONES", "2735418", "Costo IOARR Flagrancia", "«2.4 MM» en una imagen", "Falta la cifra exacta del costo aprobado y actualizado", "EPR"),
    vl("V11", "PRESUPUESTO", "2026", "Presupuesto 2026 por genérica", "La p. 11 repite el cuadro de 2025 (consulta del 06-ene-2026)",
       "Falta el PIA y PIM 2026 por genérica de gasto", "PPTO"),
    vl("V12", "INTEGRIDAD_CORTES", "01/09/2026", "Fecha del reporte de Integridad", "«Tercera Reunión … septiembre de 2026»",
       "No se indica el día; se cargó 01/09/2026", "UFI"),
    vl("V13", "DATA_INDICADORES", "RCBP", "Resolución del ranking RCBP", "Res. N° 0537-2024-P-CSJJU/PJ de fecha 15.05.2026", "El año de la resolución y el de la fecha no coinciden", "REDIJU"),
    vl("V14", "DATA_INDICADORES", "varias (2026)", "Fechas de corte «a la fecha»", "UDAJUP, Estadística, Contabilidad, SST, Seguridad, Informática, Archivo",
       "No se indica el día de corte; se dejó la fecha vacía", "UPD"),
    vl("V15", "EQUIPAMIENTO", "EQ08 a EQ14", "Año de las adquisiciones", "Módulo de Violencia e Informática", "No se indica el año de adquisición ni todos los montos", "MVIO"),
    vl("V16", "OBRAS", "OB03, OB07 a OB15", "Obras sin conformidad", "Pool de Tarma, mantenimiento pluvial, Cámara Gesell de Pampas, Flagrancia",
       "Falta el documento de conformidad, el estado o el año; las 6 OS del mantenimiento pluvial no están asignadas por sede", "INFRA"),
    vl("V17", "DATA_INDICADORES", "SEG_PERSONAL", "Personal de seguridad por sede", "59 agentes en 24 sedes", "El cuadro por sede de la p. 62 no es legible", "SEG"),
    vl("V18", "DATA_INDICADORES", "MULTAS", "Proyección de multas 2026", "Total 2025-2026 proyectado: S/ 423,602.39",
       "177,590.29 + 246,012.13 = 423,602.42 (diferencia de S/ 0.03). La proyección no se cargó", "SECOM"),
]

LEEME = [
    "GESTIÓN ADMINISTRATIVA – CSJ JUNÍN · CÓMO ACTUALIZAR ESTE EXCEL",
    "",
    "Este libro alimenta el apartado «Gestión Administrativa» del dashboard (http://localhost:8000/gestion).",
    "Es un libro aparte de dashboard.xlsx: lo actualizan las oficinas administrativas, con otra frecuencia,",
    "y no deben tocar la data jurisdiccional (magistrados, carga procesal, audiencias).",
    "Solo comparte con dashboard.xlsx los nombres de provincia y sede (hoja CAT_SEDES).",
    "",
    "Reglas:",
    "• Una fila por dato. Nunca se borra ni sobrescribe una fila: un corte nuevo es una FILA NUEVA con su fecha_corte.",
    "• El año va en la columna anio (formato largo). No se agregan columnas 2027, 2028…",
    "• Sin celdas combinadas, sin filas de totales, sin colores con significado y sin comentarios en las celdas.",
    "• Números como números (sin «S/» ni «%»); porcentajes de 0 a 100; fechas dd/mm/aaaa.",
    "• Oficina, sede, eje, indicador, tipo y estado se eligen de la lista desplegable (vienen de las hojas CAT_).",
    "• No se digitan valores calculados: % de avance, saldo, variación, m² ganados y brechas pendientes los calcula el dashboard.",
    "• Si un año no está completo: es_parcial = Sí y periodo_cubierto (ej. ene–set).",
    "",
    "Flujo de carga:",
    "1. La oficina agrega su fila con fecha de corte y documento de sustento, en estado «por validar».",
    "2. UPD revisa formato, duplicados y coherencia: cambia a «validado» o registra la observación en VALIDACIONES.",
    "3. Toda corrección se anota en BITACORA (valor anterior, valor nuevo, motivo y cargo responsable).",
    "4. El dashboard muestra el último corte validado de cada indicador. Si aún no hay uno validado, muestra el último",
    "   cargado con la marca «por validar».",
    "",
    "Carga inicial (28/10/2026): tomada del Informe de Gestión Administrativa CSJJU 2025-2026 (64 páginas).",
    "Las cifras sin observación se cargaron como «validado» (tal cual las firma el informe); UPD debe confirmarlas.",
    "Las cifras observadas están en VALIDACIONES como «por validar» y el dashboard las muestra marcadas.",
    "Guarda, cierra el Excel y recarga la página (F5). No hace falta reiniciar el servidor.",
]

GUIA = [
    ("Oficina", "Hoja que llena", "Qué carga", "Frecuencia"),
    ("Planes y Presupuesto", "DATA_INDICADORES (PPTO_*) y PRESUPUESTO", "PIA, PIM, devengado y puesto entre UE; PIA/PIM por genérica", "Mensual"),
    ("SECOM", "DATA_INDICADORES (MULTAS)", "Recaudación de multas del periodo", "Mensual"),
    ("Archivo Desconcentrado", "DATA_INDICADORES (ARCH_*)", "Atenciones y recaudación por servicios archivísticos", "Mensual"),
    ("Estadística", "DATA_INDICADORES (JORN_*, EXP_*, CAP_SIJ*)", "Actos en jornadas, expedientes al archivo y capacitaciones SIJ", "Por jornada y mensual"),
    ("UDAJUP", "DATA_INDICADORES (JP_*)", "YACHAY, capacitaciones y visitas a jueces de paz", "Trimestral"),
    ("REDIJU", "DATA_INDICADORES (RCBP, RENAVINA)", "Registros del periodo", "Mensual"),
    ("Módulo de Violencia", "DATA_INDICADORES (VIO_*)", "Expedientes resueltos y % de la meta", "Anual"),
    ("Estudios y Proyectos", "INVERSIONES, CONVENIOS, INTERVENCIONES", "Avance de IOARR; convenios y adendas", "Al cambiar de estado / al suscribirse"),
    ("Informática", "EQUIPAMIENTO", "Equipos entregados por destino y tipo", "Al entregarse"),
    ("Infraestructura", "OBRAS", "Una fila por obra y sede, con m² antes y después", "Al emitirse la conformidad"),
    ("Control Patrimonial", "PATRIMONIO", "Bajas RAEE, donaciones, transferencias y reposiciones", "Al emitirse la resolución"),
    ("Integridad, Contabilidad, SST, Seguridad", "DATA_INDICADORES e INTEGRIDAD_CORTES", "Avance del Modelo de Integridad, NICSP, SUNAFIL, EMO, seguridad", "Al recibir el reporte oficial"),
    ("Todas las oficinas", "INTERVENCIONES", "Acciones realizadas (eje, brecha, solución y sustento)", "Al concluir"),
    ("UPD", "VALIDACIONES y BITACORA", "Revisión, observaciones y registro de correcciones", "En cada carga"),
    ("", "", "", ""),
    ("Cómo cargar", "", "", ""),
    ("1", "Agrega una fila nueva al final (no borres la anterior).", "", ""),
    ("2", "Elige oficina, sede, indicador y estado de las listas desplegables.", "", ""),
    ("3", "Escribe la fecha de corte (dd/mm/aaaa), el periodo cubierto y si el año es parcial.", "", ""),
    ("4", "Escribe el número sin «S/» ni «%» y el documento de sustento (resolución, informe, acta).", "", ""),
    ("5", "Deja el estado en «por validar». UPD lo cambia a «validado».", "", ""),
    ("6", "Guarda y cierra el Excel. El dashboard se actualiza al recargar (F5).", "", ""),
]

HOJAS = [
    ("CAT_OFICINAS", ["id_oficina", "oficina", "unidad_superior", "cargo_responsable"], OFICINAS, {}, {}),
    ("CAT_SEDES", ["id_sede", "sede", "provincia", "distrito", "tipo_sede"], SEDES, {"tipo_sede": "L_TIPO_SEDE"}, {}),
    ("CAT_INDICADORES", ["id_indicador", "apartado", "eje", "nombre", "unidad", "definicion", "id_oficina", "periodicidad",
                         "sentido", "es_calculado", "formula"], IND,
     {"eje": "L_EJE", "unidad": "L_UNIDAD", "id_oficina": "L_OFICINA", "sentido": "L_SENTIDO", "es_calculado": "L_SINO"}, {}),
    ("CAT_EJES", ["id_eje", "eje"], [(f"E{i:02d}", e) for i, e in enumerate(EJES, 1)], {}, {}),
    ("DATA_INDICADORES", ["id_indicador", "anio", "fecha_corte", "periodo_cubierto", "es_parcial", "id_sede", "valor",
                          "documento_sustento", "estado_validacion", "observacion", "fecha_carga"], DATA,
     {"id_indicador": "L_INDICADOR", "es_parcial": "L_SINO", "id_sede": "L_SEDE", "estado_validacion": "L_ESTADO"},
     {"fecha_corte": "dd/mm/yyyy", "fecha_carga": "dd/mm/yyyy", "valor": "#,##0.##"}),
    ("PRESUPUESTO", ["anio", "fecha_corte", "generica", "pia", "pim", "devengado"], PRESUPUESTO, {},
     {"fecha_corte": "dd/mm/yyyy", "pia": "#,##0", "pim": "#,##0", "devengado": "#,##0"}),
    ("INVERSIONES", ["cui", "nombre", "destino", "fecha_viabilidad", "costo_aprobado", "costo_actualizado", "devengado_acumulado",
                     "programado_anio", "estado", "fecha_corte", "sustento"], INVERSIONES, {},
     {"fecha_viabilidad": "dd/mm/yyyy", "fecha_corte": "dd/mm/yyyy", "costo_aprobado": "#,##0.00", "costo_actualizado": "#,##0.00",
      "devengado_acumulado": "#,##0.00", "programado_anio": "#,##0.00"}),
    ("EQUIPAMIENTO", ["id", "anio", "destino", "id_sede", "cui", "tipo_bien", "cantidad", "monto", "sustento"], EQUIPAMIENTO,
     {"id_sede": "L_SEDE"}, {"monto": "#,##0.00"}),
    ("OBRAS", ["id_obra", "id_sede", "anio", "obra", "tipo", "area_antes_m2", "area_despues_m2", "monto", "estado", "documento",
               "fecha_conformidad"], OBRAS,
     {"id_sede": "L_SEDE", "tipo": "L_TIPO_OBRA", "estado": "L_ESTADO_OBRA"}, {"fecha_conformidad": "dd/mm/yyyy", "monto": "#,##0.00"}),
    ("PATRIMONIO", ["id", "anio", "accion", "cantidad", "resolucion", "fecha", "destinatario"], PATRIMONIO,
     {"accion": "L_ACCION"}, {"fecha": "dd/mm/yyyy"}),
    ("INTERVENCIONES", ["id", "id_oficina", "eje", "anio", "titulo", "brecha", "solucion", "sustento", "estado"], INTERVENCIONES,
     {"id_oficina": "L_OFICINA", "eje": "L_EJE", "estado": "L_ESTADO_INTERV"}, {}),
    ("CONVENIOS", ["id", "entidad", "instrumento", "objeto", "fecha_suscripcion", "fecha_vencimiento", "renovacion_automatica"],
     [(a, b, c, e, None, f, g) for a, b, c, e, f, g in CONVENIOS], {"renovacion_automatica": "L_SINO"},
     {"fecha_suscripcion": "dd/mm/yyyy", "fecha_vencimiento": "dd/mm/yyyy"}),
    ("INTEGRIDAD_CORTES", ["fecha_reporte", "corte", "etapa", "porcentaje"], INTEGRIDAD, {}, {"fecha_reporte": "dd/mm/yyyy"}),
    ("VALIDACIONES", ["id", "hoja", "clave_registro", "tema", "que_dice", "observacion", "id_oficina", "estado", "fecha_respuesta"],
     VALIDACIONES, {"id_oficina": "L_OFICINA", "estado": "L_ESTADO"}, {"fecha_respuesta": "dd/mm/yyyy"}),
    ("BITACORA", ["fecha", "hoja", "clave_registro", "valor_anterior", "valor_nuevo", "motivo", "cargo_responsable"], [], {}, {"fecha": "dd/mm/yyyy"}),
]

LISTAS = {
    "L_ESTADO": ESTADOS, "L_UNIDAD": UNIDADES, "L_TIPO_SEDE": TIPOS_SEDE, "L_TIPO_OBRA": TIPOS_OBRA,
    "L_ESTADO_OBRA": ESTADOS_OBRA, "L_ACCION": ACCIONES, "L_ESTADO_INTERV": ESTADOS_INTERV, "L_SINO": ["Sí", "No"],
    "L_SENTIDO": ["mayor es mejor", "menor es mejor"],
}


def crear(ruta):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter
    from openpyxl.workbook.defined_name import DefinedName
    from openpyxl.worksheet.datavalidation import DataValidation

    wb = Workbook()
    ws = wb.active
    ws.title = "LEEME"
    for t in LEEME:
        ws.append([t])
    ws["A1"].font = Font(bold=True, size=14, color="7F1D2D")
    ws.column_dimensions["A"].width = 120

    g = wb.create_sheet("GUIA")
    for r in GUIA:
        g.append(list(r))
    for c in g[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="7F1D2D")
    g.cell(row=GUIA.index(("Cómo cargar", "", "", "")) + 1, column=1).font = Font(bold=True, color="7F1D2D")
    for col, w in zip("ABCD", (34, 46, 62, 34)):
        g.column_dimensions[col].width = w

    li = wb.create_sheet("LISTAS")
    for j, (nombre, valores) in enumerate(LISTAS.items(), 1):
        li.cell(row=1, column=j, value=nombre).font = Font(bold=True)
        for i, v in enumerate(valores, 2):
            li.cell(row=i, column=j, value=v)
        letra = get_column_letter(j)
        wb.defined_names[nombre] = DefinedName(nombre, attr_text=f"LISTAS!${letra}$2:${letra}${len(valores) + 1}")
        li.column_dimensions[letra].width = 20
    for nombre, hoja in (("L_OFICINA", "CAT_OFICINAS"), ("L_SEDE", "CAT_SEDES"), ("L_INDICADOR", "CAT_INDICADORES")):
        wb.defined_names[nombre] = DefinedName(nombre, attr_text=f"{hoja}!$A$2:$A$500")
    wb.defined_names["L_EJE"] = DefinedName("L_EJE", attr_text="CAT_EJES!$B$2:$B$500")

    for nombre, cab, filas, listas, formatos in HOJAS:
        ws = wb.create_sheet(nombre)
        ws.append(cab)
        for f in filas:
            ws.append(list(f))
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="7F1D2D" if not nombre.startswith("CAT_") else "374151")
            c.alignment = Alignment(vertical="center")
        ws.freeze_panes = "A2"
        for j, col in enumerate(cab, 1):
            letra = get_column_letter(j)
            largo = max([len(col)] + [len(str(f[j - 1])) for f in filas if f[j - 1] is not None])
            ws.column_dimensions[letra].width = min(max(12, largo + 2), 60)
            if col in formatos:
                for i in range(2, len(filas) + 2):
                    ws.cell(row=i, column=j).number_format = formatos[col]
            if col in listas:
                dv = DataValidation(type="list", formula1=f"={listas[col]}", allow_blank=True,
                                    showErrorMessage=True, errorTitle="Fuera de catálogo",
                                    error="Elige un valor de la lista (catálogos CAT_ u hoja LISTAS).")
                dv.add(f"{letra}2:{letra}2000")
                ws.add_data_validation(dv)
    wb.move_sheet("LISTAS", offset=len(wb.sheetnames))
    wb.save(ruta)


if __name__ == "__main__":
    if DESTINO.exists() and "--todo" not in sys.argv:
        print(f"{DESTINO.name} ya existe: no se toca. Usa --todo para recrearlo (se pierde lo cargado).")
    else:
        crear(DESTINO)
        print(f"Creado {DESTINO.name}: {len(DATA)} valores, {len(OBRAS)} obras, {len(INTERVENCIONES)} intervenciones, "
              f"{len(CONVENIOS)} convenios, {len(VALIDACIONES)} cifras por validar.")
