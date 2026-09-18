from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Flowable,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "output" / "pdf"
OUT_DIR.mkdir(parents=True, exist_ok=True)
PDF_PATH = OUT_DIR / "libreria-arias-sistema-visual-v0.1.pdf"

PAGE_W, PAGE_H = A4
GOLD = colors.HexColor("#fece01")
GOLD_INK = colors.HexColor("#1a1200")
INK = colors.HexColor("#151515")
PAPER = colors.HexColor("#fbfbfd")
SURFACE = colors.HexColor("#ffffff")
MUTED = colors.HexColor("#5f6067")
LINE = colors.HexColor("#d8d8de")
OK = colors.HexColor("#167b2c")
ERR = colors.HexColor("#b42318")


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "DeckTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=34,
        leading=37,
        textColor=colors.white,
        alignment=TA_LEFT,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        "DeckSubtitle",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#d8d8de"),
    )
)
styles.add(
    ParagraphStyle(
        "H1Arias",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=29,
        textColor=INK,
        spaceBefore=4,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "H2Arias",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=INK,
        spaceBefore=12,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "BodyArias",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.8,
        leading=14.2,
        textColor=colors.HexColor("#232326"),
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        "SmallArias",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=11.2,
        textColor=MUTED,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "CardTitle",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=10.4,
        leading=13,
        textColor=INK,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "HeaderCell",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.white,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        "Quote",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=21,
        textColor=INK,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
)


class Swatch(Flowable):
    def __init__(self, label, value, text_color=colors.white):
        super().__init__()
        self.label = label
        self.value = value
        self.fill = colors.HexColor(value)
        self.text_color = text_color
        self.width = 48 * mm
        self.height = 22 * mm

    def draw(self):
        c = self.canv
        c.setFillColor(self.fill)
        c.roundRect(0, 0, self.width, self.height, 5, stroke=0, fill=1)
        c.setFillColor(self.text_color)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(5 * mm, 12 * mm, self.label)
        c.setFont("Helvetica", 7.5)
        c.drawString(5 * mm, 6 * mm, self.value)


class Rule(Flowable):
    def __init__(self, color=GOLD, width=34 * mm):
        super().__init__()
        self.width = width
        self.height = 4
        self.color = color

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(3)
        self.canv.line(0, 1, self.width, 1)


def P(text, style="BodyArias"):
    return Paragraph(text, styles[style])


def bullets(items):
    rows = [[P("-", "BodyArias"), P(item, "BodyArias")] for item in items]
    return Table(
        rows,
        colWidths=[6 * mm, 156 * mm],
        style=[
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 2),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
        ],
    )


def card(title, body):
    return Table(
        [[P(title, "CardTitle")], [P(body)]],
        colWidths=[78 * mm],
        style=[
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ffffff")),
            ("BOX", (0, 0), (-1, -1), 0.7, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 9),
            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ],
    )


def table(data, widths):
    return Table(
        [[P(str(cell), "HeaderCell" if r == 0 else "SmallArias") for cell in row] for r, row in enumerate(data)],
        colWidths=widths,
        repeatRows=1,
        style=[
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("GRID", (0, 0), (-1, -1), 0.35, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ],
    )


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, PAGE_H - 15 * mm, PAGE_W - 18 * mm, PAGE_H - 15 * mm)
    canvas.setFont("Helvetica-Bold", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, PAGE_H - 11 * mm, "Libreria Arias - Sistema visual v0.1")
    canvas.drawRightString(PAGE_W - 18 * mm, PAGE_H - 11 * mm, "11/09/2026")
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_W - 18 * mm, 11 * mm, str(doc.page))
    canvas.restoreState()


def cover(story):
    logo = ROOT / "assets" / "brand" / "wordmark-dark.webp"
    mark = ROOT / "assets" / "brand" / "crane@512.webp"
    logo_flow = Spacer(1, 1)
    if logo.exists():
        logo_flow = Image(str(logo), width=92 * mm, height=24.9 * mm)
        logo_flow.hAlign = "LEFT"
    title = P("Sistema visual", "DeckTitle")
    subtitle = P("Una base premium para que la web de Libreria Arias se vea clara, cercana, energica y profesional antes de redisenar cada pantalla.", "DeckSubtitle")
    version = P("Version 0.1 - Base de trabajo - 11/09/2026", "DeckSubtitle")
    mark_flow = Spacer(1, 1)
    if mark.exists():
        mark_flow = Image(str(mark), width=34 * mm, height=34 * mm)
        mark_flow.hAlign = "RIGHT"
    cover_table = Table(
        [
            [logo_flow],
            [Spacer(1, 32 * mm)],
            [title],
            [subtitle],
            [Spacer(1, 16 * mm)],
            [version],
            [Spacer(1, 42 * mm)],
            [mark_flow],
        ],
        colWidths=[174 * mm],
        rowHeights=[28 * mm, 32 * mm, 20 * mm, 28 * mm, 16 * mm, 12 * mm, 42 * mm, 40 * mm],
        style=[
            ("BACKGROUND", (0, 0), (-1, -1), INK),
            ("BOX", (0, 0), (-1, -1), 0, INK),
            ("LINEABOVE", (0, 0), (-1, 0), 16, GOLD),
            ("LEFTPADDING", (0, 0), (-1, -1), 12 * mm),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12 * mm),
            ("TOPPADDING", (0, 0), (-1, -1), 5 * mm),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5 * mm),
        ],
    )
    story.append(cover_table)
    story.append(PageBreak())


def section_title(story, title, subtitle=None):
    story.append(Rule())
    story.append(Spacer(1, 5 * mm))
    story.append(P(title, "H1Arias"))
    if subtitle:
        story.append(P(subtitle))


def build():
    doc = BaseDocTemplate(
        str(PDF_PATH),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=22 * mm,
        bottomMargin=18 * mm,
        title="Libreria Arias - Sistema visual v0.1",
        author="Codex para Libreria Arias",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="body", frames=[frame], onPage=header_footer)])

    story = []
    cover(story)

    section_title(story, "1. Marca y direccion", "Libreria Arias no es solo una libreria de libros: es un comercio local amplio con libreria, bazar, juguetes, regalos, electronica y tecnologia.")
    story.append(P("Posicionamiento de trabajo", "H2Arias"))
    story.append(P("Un lugar cercano para descubrir cosas utiles, elegir con claridad y resolver el pedido con personas del local.", "Quote"))
    story.append(P("El amarillo, la grulla, el wordmark y Adolfito sostienen una identidad energetica y reconocible. El eslogan existente \"El Temu 2.0 riojano\" se conserva en los activos originales y no se reformula sin decision de Fran."))
    story.append(Table([[card("Cercana", "Voseo, ayuda concreta, contacto humano y salida clara por WhatsApp."), card("Energetica", "Amarillo puntual, titulos seguros y Adolfito solo cuando acompana una tarea.")]], colWidths=[86 * mm, 86 * mm]))
    story.append(Spacer(1, 5 * mm))
    story.append(Table([[card("Resolutiva", "Precio, disponibilidad, resumen de pedido y recuperacion de errores."), card("Confiable", "No inventar stock, descuentos, garantias ni compra confirmada.")]], colWidths=[86 * mm, 86 * mm]))
    story.append(PageBreak())

    section_title(story, "2. Fundamentos visuales")
    story.append(P("La interfaz usa fondos y superficies planas para que productos, precios y acciones tengan prioridad. El volumen vive en los activos de marca, no como decoracion permanente de UI."))
    story.append(Table([[Swatch("Marca", "#fece01", GOLD_INK), Swatch("Oscuro", "#151515"), Swatch("Superficie", "#1e1e1e"), Swatch("Claro", "#fbfbfd", INK)]], colWidths=[40 * mm] * 4))
    story.append(Spacer(1, 7 * mm))
    story.append(table([
        ["Rol", "Oscuro", "Claro"],
        ["Fondo", "#151515", "#fbfbfd"],
        ["Superficie", "#1e1e1e", "#ffffff"],
        ["Texto principal", "#f5f5f7", "#101012"],
        ["Texto secundario", "#a1a1a6", "#3d3d42"],
        ["Texto sobre amarillo", "#1a1200", "#1a1200"],
    ], [46 * mm, 58 * mm, 58 * mm]))
    story.append(P("Tipografia: Inter 400-700 para interfaz; el wordmark es imagen. Cuerpo de lectura de 17px, rotulos utiles de 14px o mas, controles de 44px minimo y 48px para acciones principales.", "SmallArias"))
    story.append(PageBreak())

    section_title(story, "3. Componentes")
    story.append(P("Cada componente debe declarar estado y proxima accion. La web prepara pedidos por WhatsApp; por eso no debe usar lenguaje de compra cerrada."))
    story.append(table([
        ["Componente", "Contrato"],
        ["Boton primario", "Amarillo con texto oscuro, verbo claro y foco visible."],
        ["Busqueda", "Conserva texto, muestra conteo y ofrece limpiar filtros."],
        ["Tarjeta", "Foto, categoria si ayuda, nombre, precio o consulta, disponibilidad y accion."],
        ["Pedido", "Lineas editables, total estimado y confirmacion humana explicita."],
        ["Promo", "Condicion cerca del beneficio y carrusel pausado si se mueve."],
    ], [46 * mm, 116 * mm]))
    product = ROOT / "assets" / "products" / "pizarra-lcd-de-12-pulgadas.webp"
    if product.exists():
        story.append(Spacer(1, 5 * mm))
        story.append(KeepTogether([
            P("Ejemplo de tarjeta base", "H2Arias"),
            Image(str(product), width=48 * mm, height=48 * mm),
            P("Pizarra LCD de 12 pulgadas", "CardTitle"),
            P("Precio y disponibilidad deben venir de datos reales. Si faltan: \"Consulta el precio\" y \"Consulta disponibilidad\".", "SmallArias"),
        ]))
    story.append(PageBreak())

    section_title(story, "4. Experiencia")
    story.append(P("El flujo principal es buscar o explorar, entender, agregar, revisar y continuar por WhatsApp. Mobile se disena primero porque el pedido debe resolverse con un pulgar y sin aprendizaje previo."))
    story.append(table([
        ["Momento", "Debe resolver"],
        ["Primera pantalla", "Reconocer Arias y dejar visible catalogo o accion siguiente."],
        ["Exploracion", "Categorias, busqueda, filtros y retorno sin perder estado."],
        ["Eleccion", "Producto claro, precio o consulta, disponibilidad y condicion."],
        ["WhatsApp", "Resumen editable y aviso de que Arias confirma stock."],
        ["Recuperacion", "Reintento, copiar mensaje, limpiar filtros o derivar a contacto humano."],
    ], [46 * mm, 116 * mm]))
    story.append(bullets([
        "Abrir WhatsApp no significa pedido confirmado.",
        "La mascota acompana, no reemplaza texto ni accion.",
        "Apto para un nino significa comprensible, no infantil.",
    ]))
    story.append(PageBreak())

    section_title(story, "5. Movimiento")
    story.append(P("La animacion confirma acciones, muestra continuidad y orienta cambios. No debe competir con precio, producto ni lectura."))
    story.append(table([
        ["Patron", "Duracion"],
        ["Presionado", "120-180ms"],
        ["Filtro o tema", "160-280ms"],
        ["Agregar al pedido", "240-360ms"],
        ["Panel o modal", "280-440ms"],
        ["Escena principal", "440-850ms, una sola vez"],
    ], [62 * mm, 100 * mm]))
    story.append(P("Si la persona activa movimiento reducido, el contenido sigue completo y los cambios son inmediatos o casi inmediatos. Preferir transform y opacity; no prometer rendimiento sin medir.", "SmallArias"))
    story.append(PageBreak())

    section_title(story, "6. Referencias y metodo")
    story.append(P("Awesome DESIGN.md de VoltAgent queda como fuente principal para cada pedido de diseno. La adaptacion siempre empieza por Arias: marca, accesibilidad, datos reales y salida por WhatsApp."))
    story.append(table([
        ["Necesidad", "Referencia principal"],
        ["Catalogo y ficha", "Nike + Airbnb"],
        ["Jerarquia visual", "Apple + Nike"],
        ["Amarillo y tono cercano", "Miro + PostHog"],
        ["Promos editoriales", "Wired + Nike"],
        ["Consistencia y estados", "Linear + Airbnb"],
    ], [58 * mm, 104 * mm]))
    story.append(P("Para redisenos importantes se aplica Design Loop: brief, referencia, pieza renderizada y tres criticos independientes mirando la misma version. Un PASS exige evidencia, no intuicion.", "SmallArias"))
    story.append(PageBreak())

    section_title(story, "7. Calidad")
    story.append(P("La calidad se valida con captura, recorrido, teclado, mobile, contraste y estados. El sistema no certifica mejora comercial: prepara una base para iterar con referencias y pruebas."))
    story.append(bullets([
        "Contraste objetivo WCAG 2.2 AA: 4.5:1 para texto normal.",
        "Probar 375px y 1440px; sumar 320, 768 y 1024px cuando haya dudas.",
        "Revisar tema claro, oscuro, teclado, errores, carga, sin imagen, sin precio y stock desconocido.",
        "Verificar que se entienda que WhatsApp inicia una consulta y el local confirma.",
    ]))
    story.append(Spacer(1, 5 * mm))
    story.append(P("Pendientes de marca", "H2Arias"))
    story.append(bullets([
        "Historia y valores reales de Adolfo.",
        "Publicos prioritarios y direccion comercial a 2-3 anos.",
        "Politicas operativas antes de redactar envios, pagos o garantias.",
        "Intensidad y frecuencia de Adolfito segun referencias elegidas.",
    ]))
    story.append(PageBreak())

    section_title(story, "8. Fuentes")
    story.append(P("El PDF resume el sistema vivo del repositorio. Las fuentes completas quedan en los documentos locales para no duplicar contexto en cada sesion.", "BodyArias"))
    story.append(table([
        ["Fuente", "Uso"],
        ["DESIGN.md y docs/design-system", "Base visual, componentes, experiencia, movimiento y calidad."],
        ["docs/design-system.md", "Manual heredado preservado como punto de partida."],
        ["VoltAgent/awesome-design-md", "Fuente principal de referencias para futuros disenos."],
        ["WCAG 2.2 y WAI-ARIA", "Criterios de contraste, foco, reflow, dialogos y controles."],
        ["Web Vitals", "Marco de rendimiento a medir cuando se toque la web real."],
    ], [54 * mm, 108 * mm]))
    story.append(P("Revision de referencia local: 8147538b4226ae41e2487a9179e3bcc1f68e8554. Las propuestas no modifican la tienda hasta que se implementen y validen por pieza.", "SmallArias"))

    doc.build(story)
    print(PDF_PATH)


if __name__ == "__main__":
    build()
