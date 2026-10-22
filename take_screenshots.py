import os
import sys
import time
from playwright.sync_api import sync_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

output_dir = r"C:\Users\USUARIO\Desktop\caps"
os.makedirs(output_dir, exist_ok=True)

# Limpiar capturas previas
for f in os.listdir(output_dir):
    try:
        os.remove(os.path.join(output_dir, f))
    except Exception:
        pass

def save(page, name):
    time.sleep(2)
    path = os.path.join(output_dir, f"{name}.png")
    page.screenshot(path=path)
    print(f"  OK -> {name}.png")

def click_bottom_tab(page, label):
    page.evaluate(f"""() => {{
        const all = Array.from(document.querySelectorAll('div, a, button'));
        const matches = all.filter(e => e.innerText && e.innerText.trim() === '{label}');
        if (matches.length > 0) {{
            matches[matches.length - 1].click();
        }}
    }}""")
    time.sleep(2.5)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="msedge")
    ctx = browser.new_context(
        viewport={"width": 414, "height": 896},
        device_scale_factor=2,
        is_mobile=True,
        has_touch=True,
    )
    page = ctx.new_page()

    # 1. PUBLICAS
    print("\n--- 1. PÚBLICAS Y ACCESO ---")
    page.goto("http://localhost:8081/sign-in", wait_until="networkidle")
    time.sleep(2)
    save(page, "01_publico_login")

    page.locator("text=Crear cuenta").first.click()
    time.sleep(1.5)
    save(page, "02_publico_registro")

    page.locator("text=términos y condiciones").first.click()
    time.sleep(2)
    save(page, "03_publico_terminos_y_condiciones")

    page.go_back()
    time.sleep(1)
    page.goto("http://localhost:8081/reset-password", wait_until="networkidle")
    time.sleep(2)
    save(page, "04_publico_restablecer_contrasena")

    # 2. ROL ENFERMERA
    print("\n--- 2. ROL ENFERMERA ---")
    page.goto("http://localhost:8081/sign-in", wait_until="networkidle")
    time.sleep(1.5)
    page.locator("text=Entrar como enfermera").first.click()
    time.sleep(3)
    save(page, "05_enfermera_inicio_dashboard")

    click_bottom_tab(page, "Turnos")
    save(page, "06_enfermera_turnos_lista")

    page.locator("text=Enfermero(a) para urgencias").first.click()
    time.sleep(2.5)
    save(page, "07_enfermera_detalle_turno")

    click_bottom_tab(page, "Postulaciones")
    save(page, "08_enfermera_postulaciones_lista")

    click_bottom_tab(page, "Mensajes")
    save(page, "09_enfermera_mensajes_inbox")

    # Clic en conversación para entrar al chat
    page.evaluate("""() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(e => e.innerText && e.innerText.includes('Clínica del Caribe'));
        if (cards.length > 0) cards[0].click();
    }""")
    time.sleep(3)
    save(page, "10_enfermera_chat_conversacion")

    # Regresar usando tab de perfil
    click_bottom_tab(page, "Perfil")
    save(page, "11_enfermera_perfil_profesional")

    page.locator("text=Cerrar sesión").first.click()
    time.sleep(2.5)

    # 3. ROL INSTITUCIÓN
    print("\n--- 3. ROL INSTITUCIÓN ---")
    page.goto("http://localhost:8081/sign-in", wait_until="networkidle")
    time.sleep(1.5)
    page.locator("text=Entrar como institución").first.click()
    time.sleep(3)
    save(page, "12_institucion_inicio_dashboard")

    click_bottom_tab(page, "Institución")
    save(page, "13_institucion_panel_publicar_turnos")

    click_bottom_tab(page, "Turnos")
    save(page, "14_institucion_turnos_explorar")

    click_bottom_tab(page, "Mensajes")
    save(page, "15_institucion_mensajes_inbox")

    page.evaluate("""() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(e => e.innerText && e.innerText.includes('Ana Lucía'));
        if (cards.length > 0) cards[0].click();
    }""")
    time.sleep(3)
    save(page, "16_institucion_chat_con_enfermera")

    click_bottom_tab(page, "Perfil")
    save(page, "17_institucion_perfil_datos")

    page.locator("text=Cerrar sesión").first.click()
    time.sleep(2.5)

    # 4. ROL ADMIN
    print("\n--- 4. ROL ADMIN ---")
    page.goto("http://localhost:8081/sign-in", wait_until="networkidle")
    time.sleep(1.5)
    page.locator("text=Entrar como administración").first.click()
    time.sleep(3)
    save(page, "18_admin_inicio_dashboard")

    click_bottom_tab(page, "Admin")
    save(page, "19_admin_panel_verificaciones")

    click_bottom_tab(page, "Turnos")
    save(page, "20_admin_turnos_supervision")

    click_bottom_tab(page, "Perfil")
    save(page, "21_admin_perfil_cuenta")

    browser.close()
    print("\n¡TODAS LAS CAPTURAS COMPLETADAS SATISFACTORIAMENTE!")
