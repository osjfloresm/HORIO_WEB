import { createHash } from 'node:crypto'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('admin creates and edits an astronaut, then confirms its desktop link', async ({ page }) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login')
  await page
    .getByRole('textbox', { name: 'Correo electrónico', exact: true })
    .fill('admin@horion.demo')
  await page.getByLabel('Contraseña').fill('HorionDemo2026!')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await page.getByRole('link', { name: 'Astronautas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Astronautas', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Nuevo astronauta', exact: true }).click()
  await page.getByLabel('Nombre completo').fill('Tripulante E2E')
  await page.getByLabel('Código del escritorio').fill('AST-E2E')
  await page.getByLabel('Misión asignada').selectOption({ index: 1 })
  await page.getByLabel('Fecha de nacimiento').fill('1991-04-12')
  await page.getByLabel('Grupo sanguíneo (opcional)').fill('O+')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByLabel('Buscar por nombre, código o misión').fill('AST-E2E')
  const row = page.getByRole('row').filter({ hasText: 'AST-E2E' })
  await expect(row).toContainText('Esperando primer envío')
  await row.getByRole('button', { name: 'Editar a Tripulante E2E' }).click()
  await page.getByLabel('Nombre completo').fill('Tripulante E2E editada')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(row).toContainText('Tripulante E2E editada')

  // This endpoint belongs to Playwright's disposable database, never the live server.
  const payload = {
    codigo_astronauta: 'AST-E2E',
    registros: [
      {
        frecuencia_cardiaca: 73,
        horas_sueno: null,
        hrv: '47.00',
        spo2: '98.00',
        temperatura_corporal: '36.70',
        timestamp_utc: new Date().toISOString(),
      },
    ],
  }
  const canonical = JSON.stringify(payload)
  const response = await page.request.post('http://127.0.0.1:8011/api/v1/sync/ingest/', {
    headers: { 'X-Edge-Key': 'horion-e2e-edge-key' },
    data: { payload, hash_sha256: createHash('sha256').update(canonical).digest('hex') },
  })
  expect(response.status()).toBe(201)
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click()
  await expect(row).toContainText('Datos recibidos')
  await expect(row).toContainText('UTC')
  await row.getByRole('button', { name: 'Editar a Tripulante E2E editada' }).click()
  await expect(page.getByLabel('Código del escritorio')).toHaveAttribute('readonly', '')
  await expect(page.getByLabel('Misión asignada')).toBeDisabled()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()

  await page.getByRole('button', { name: 'Nuevo astronauta', exact: true }).click()
  await page.getByLabel('Nombre completo').fill('Duplicado E2E')
  await page.getByLabel('Código del escritorio').fill('AST-E2E')
  await page.getByLabel('Misión asignada').selectOption({ index: 1 })
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-01')
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Este código ya tiene un perfil')
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(audit.violations).toEqual([])
  await page.screenshot({
    path: 'test-results/astronauts-desktop.png',
    fullPage: true,
    animations: 'disabled',
  })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await page.screenshot({
    path: 'test-results/astronauts-mobile.png',
    fullPage: true,
    animations: 'disabled',
  })
  expect(errors).toEqual([])
})
