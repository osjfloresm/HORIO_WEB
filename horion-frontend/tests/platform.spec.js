import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const password = 'HorionDemo2026!'
async function login(page, account) {
  await page.goto('/login')
  await page
    .getByRole('textbox', { name: 'Correo electrónico', exact: true })
    .fill(`${account}@horion.demo`)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  await expect(page.locator('.user-block')).toBeVisible()
}
const pdf = {
  name: 'proposal.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF-1.4\n%%EOF'),
}

test('public pages, responsive landing, registration variants and accessible navigation', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /La ciencia del espacio/ })).toBeVisible()
  await expect(page.getByText('Entorno de demostración', { exact: false })).toBeVisible()
  await page.screenshot({ path: 'test-results/landing-desktop.png', fullPage: true })
  const accessibility = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze()
  expect(accessibility.violations).toEqual([])
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({ path: 'test-results/landing-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Abrir menú' }).click()
  await page.getByRole('link', { name: 'Ciencia abierta', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Los datos abren nuevos horizontes.' }),
  ).toBeVisible()
  await expect(page.locator('.content-card')).toHaveCount(4)
  await page.goto('/register')
  await page.getByRole('button', { name: 'Empresa', exact: true }).click()
  await expect(page.getByLabel('ID fiscal / DUNS')).toBeVisible()
  await expect(page.getByLabel('Sector')).toBeVisible()
  await page.getByRole('button', { name: 'Profesional', exact: true }).click()
  await expect(page.getByLabel('Especialidad médica o técnica')).toBeVisible()
  await page.getByLabel('Nombre completo').fill('Nueva Especialista')
  await page
    .getByRole('textbox', { name: 'Correo electrónico', exact: true })
    .fill('new-user@example.org')
  await page.getByLabel('Contraseña').fill('SecureRegister!2026')
  await page.getByLabel('Especialidad médica o técnica').fill('Medicina espacial')
  await page.getByLabel('Código ORCID').fill('0000-0001-2345-6789')
  await page.getByLabel('País').fill('Ecuador')
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click()
  await expect(page).toHaveURL(/opportunities\/board/)
  expect(errors).toEqual([])
})

test('admin can navigate all five screens, create protocol and inspect publication', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await login(page, 'admin')
  await expect(page.getByRole('heading', { name: 'Control de misión', exact: true })).toBeVisible()
  await expect(page.locator('.stat').first()).toContainText('240')
  await page.screenshot({ path: 'test-results/telemetry-desktop.png', fullPage: true })
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
  await page.getByRole('link', { name: 'Laboratorio clínico', exact: true }).click()
  await page.getByRole('button', { name: 'Nuevo protocolo', exact: true }).click()
  await page.getByLabel('Título del protocolo o terapia').fill('Protocolo E2E')
  await page.getByLabel('Misión objetivo').selectOption({ label: 'EXP-72' })
  await page.getByLabel('Objetivo clínico').fill('Estudiar descanso y HRV con datos sintéticos.')
  await page.getByLabel('Hallazgos y metodología').fill('Se revisaron las series temporales.')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Protocolo E2E' })).toBeVisible()
  await page.getByRole('link', { name: 'Liberación de datos', exact: true }).click()
  await page.getByRole('button', { name: 'Inspeccionar', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toContainText('uuid_sujeto')
  await expect(page.getByRole('dialog')).toContainText('nombre_completo')
  await page
    .getByLabel('Descripción y contexto científico')
    .fill('Dataset E2E: revisión de datos sintéticos.')
  await page.getByLabel('He revisado la muestra y autorizo la publicación de estos datos.').check()
  await page.getByRole('button', { name: 'Liberar al repositorio público' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('link', { name: 'Moderación científica', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Moderación de aportaciones', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Gestor de convocatorias', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Gestor de convocatorias', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Nueva convocatoria', exact: true }).click()
  await page.getByLabel('Código de convocatoria').fill('E2E-CALL')
  await page.getByLabel('Título', { exact: false }).fill('Convocatoria E2E')
  await page.getByLabel('Dirigida a').selectOption('AMBOS')
  await page.getByLabel('Área de necesidad').selectOption('SOFTWARE_ESPACIAL')
  await page.getByLabel('Descripción').fill('Desafío de software con datos sintéticos.')
  await page.getByLabel('Requisitos técnicos').fill('Adjuntar plan de validación.')
  await page.getByLabel('Dataset de referencia').selectOption({ index: 1 })
  await page.getByLabel('Presupuesto estimado (USD)').fill('80000')
  await page
    .getByLabel('Apertura (UTC)')
    .fill(new Date(Date.now() - 86400000).toISOString().slice(0, 16))
  await page
    .getByLabel('Cierre (UTC)')
    .fill(new Date(Date.now() + 86400000 * 60).toISOString().slice(0, 16))
  await page.getByLabel('Estado', { exact: false }).selectOption('ABIERTA')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  const newCall = page.getByRole('row').filter({ hasText: 'Convocatoria E2E' })
  await expect(newCall).toBeVisible()
  await newCall.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Estado', { exact: false }).selectOption('CERRADA')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(newCall).toContainText('Cerrada')
  await page.getByRole('button', { name: 'Evaluar postulaciones' }).click()
  await expect(page.getByRole('button', { name: 'Evaluar', exact: true }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Evaluar', exact: true }).first().click()
  await page.getByLabel('Resultado de evaluación').selectOption('FINALISTA')
  await page
    .getByLabel('Observaciones para el postulante')
    .fill('La propuesta pasa a la siguiente fase.')
  await page.getByRole('button', { name: 'Guardar evaluación' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.setViewportSize({ width: 375, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.getByRole('button', { name: 'Abrir navegación' }).click()
  await page.getByRole('link', { name: 'Control de misión', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Control de misión', exact: true })).toBeVisible()
  await page.screenshot({ path: 'test-results/telemetry-mobile.png', fullPage: true })
  expect(errors).toEqual([])
})

test('researcher downloads real CSV, submits paper, administrator approves and public sees it', async ({
  page,
  browser,
}) => {
  await login(page, 'researcher')
  await page.getByRole('button', { name: 'Explorar dataset' }).first().click()
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar CSV' }).click()
  const downloaded = await event
  expect(downloaded.suggestedFilename()).toMatch(/\.csv$/)
  await page.getByRole('link', { name: 'Aportaciones científicas', exact: true }).click()
  await page.getByRole('button', { name: 'Subir aportación' }).click()
  await page.getByLabel('Título del trabajo').fill('Investigación E2E publicada')
  await page.getByLabel('Repositorio de datos utilizado').selectOption({ index: 1 })
  await page
    .getByLabel('Resumen y metodología')
    .fill('Metodología reproducible con datos sintéticos.')
  await page.getByLabel('Paper (PDF)').setInputFiles(pdf)
  await page.getByRole('button', { name: 'Enviar a revisión' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: 'Investigación E2E publicada' })).toBeVisible()
  await page.goto('/nasa-admin/telemetry')
  await expect(
    page.getByRole('heading', { name: 'Este espacio requiere otro perfil' }),
  ).toBeVisible()
  const adminContext = await browser.newContext()
  const admin = await adminContext.newPage()
  await login(admin, 'admin')
  await admin.goto('/nasa-admin/moderation')
  const card = admin.locator('.content-card').filter({ hasText: 'Investigación E2E publicada' })
  await card.getByRole('button', { name: 'Aprobar y publicar' }).click()
  await admin.getByRole('button', { name: 'Confirmar publicación' }).click()
  await expect(admin.getByRole('dialog')).not.toBeVisible()
  const publicContext = await browser.newContext()
  const publicPage = await publicContext.newPage()
  await publicPage.goto('/open-science/contributions')
  await expect(
    publicPage.getByRole('heading', { name: 'Investigación E2E publicada' }),
  ).toBeVisible()
  await adminContext.close()
  await publicContext.close()
})

for (const account of ['professional', 'enterprise']) {
  test(`${account} submits adaptive application and sees its status`, async ({ page }) => {
    await login(page, account)
    const target =
      account === 'enterprise'
        ? 'Plataforma de análisis biométrico'
        : 'Protocolo de recuperación circadiana'
    const card = page.locator('.content-card').filter({ hasText: target })
    await card.getByRole('link', { name: 'Ver convocatoria' }).click()
    await page.getByLabel('Título de la propuesta').fill(`Propuesta E2E ${account}`)
    if (account === 'enterprise') {
      await page.getByLabel('Categoría de solución').selectOption('SOFTWARE')
      await page.getByLabel('Madurez tecnológica').fill('7')
      await page
        .getByLabel('Propuesta técnica y plan de validación')
        .fill('Software validado con las series sintéticas.')
      await page.getByLabel('Cotización (USD)').fill('50000')
      await page.getByLabel('Ficha técnica (PDF)').setInputFiles(pdf)
    } else {
      await page.getByLabel('Especialidad médica o técnica').fill('Medicina espacial')
      await page
        .getByLabel('Experiencia clínica / aeroespacial')
        .fill('Diez años en investigación clínica.')
      await page
        .getByLabel('Propuesta de intervención / terapia')
        .fill('Protocolo de evaluación del descanso.')
      await page.getByLabel('Honorarios estimados (USD)').fill('25000')
      await page.getByLabel('CV y credenciales (PDF)').setInputFiles(pdf)
    }
    await page.getByRole('button', { name: 'Enviar postulación' }).click()
    await expect(page).toHaveURL(/my-applications/)
    await expect(
      page.getByRole('heading', { name: `Propuesta E2E ${account}`, exact: true }),
    ).toBeVisible()
    await expect(
      page.locator('.content-card').filter({ hasText: `Propuesta E2E ${account}` }),
    ).toContainText('Recibida')
  })
}

test('portal switch closes public applications and subscription persists', async ({
  page,
  browser,
}) => {
  await login(page, 'admin')
  await page.goto('/nasa-admin/calls-manager')
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'Confirmar cambio' }).click()
  await expect(page.getByRole('switch')).not.toBeChecked()
  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto('/opportunities/board')
  await expect(
    visitor.getByRole('heading', { name: 'Las grandes misiones también tienen su momento.' }),
  ).toBeVisible()
  await visitor.getByLabel('Recibe novedades en tu correo').fill('new-subscriber@example.org')
  await visitor.getByRole('button', { name: 'Suscribirme a novedades' }).click()
  await expect(visitor.getByText('Tu suscripción está registrada.', { exact: false })).toBeVisible()
  await page.getByRole('switch').click()
  await page.getByRole('button', { name: 'Confirmar cambio' }).click()
  await expect(page.getByRole('switch')).toBeChecked()
  await context.close()
})
