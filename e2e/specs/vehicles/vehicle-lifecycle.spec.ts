/**
 * E2E: Full Vehicle Lifecycle — UI-driven, como lo haría un usuario real.
 *
 * Este test reemplaza la versión anterior que dependía de llamadas API para las
 * transiciones de estado. Ahora el test actúa como un usuario real:
 *   - Crea la vehicle instance rellenando el formulario UI
 *   - Cambia el status usando el dropdown de estado + "Save Changes"
 *   - Realiza la inspección desde la página de inspección
 *   - Hace click en "Submit to Customer"
 *   - Aprueba reparaciones en el Customer Portal
 *   - Marca operaciones como completadas desde la tabla de operaciones
 *   - Verifica la re-entrada del mismo vehículo (nueva vehicleInstance)
 *
 * Llamadas API solo para:
 *   - Setup inicial (IDs de plantillas y clientes)
 *   - POST /complete-inspection (no existe botón UI para este endpoint)
 *   - Guard test (validación backend)
 *   - Cleanup (teardown even on failure)
 *
 * Estados cubiertos:
 *   checked_in → pending_inspection → pending_estimation
 *   → pending_approval → pending_operations → ready_for_pickup → checked_out
 *   + re-entry (nueva vehicleInstance para el mismo vehículo)
 */

import { expect, Locator, test } from '@playwright/test';
import { loginAsAdmin } from '../../helpers/auth';

const API = 'http://localhost:3000';

type PW = import('@playwright/test').Page;

// ─── API helpers ──────────────────────────────────────────────────────────────

async function getToken(page: PW): Promise<string> {
  const raw = await page.evaluate(() => localStorage.getItem('auth'));
  if (!raw) throw new Error('No auth token in localStorage');
  const parsed = JSON.parse(raw) as { token?: string };
  if (!parsed.token) throw new Error('auth.token missing in localStorage.auth');
  return parsed.token;
}

function apiHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function apiGet(page: PW, token: string, path: string) {
  const res = await page.request.get(`${API}${path}`, { headers: apiHeaders(token) });
  expect(res.ok(), `GET ${path} → ${res.status()}`).toBeTruthy();
  return res.json();
}

async function apiPost(page: PW, token: string, path: string, body: unknown) {
  const res = await page.request.post(`${API}${path}`, {
    headers: apiHeaders(token),
    data: body,
  });
  expect(
    res.ok(),
    `POST ${path} → ${res.status()}: ${await res.text().catch(() => '')}`,
  ).toBeTruthy();
  return res.json();
}

async function apiPatch(page: PW, token: string, path: string, body: unknown) {
  const res = await page.request.patch(`${API}${path}`, {
    headers: apiHeaders(token),
    data: body,
  });
  expect(
    res.ok(),
    `PATCH ${path} → ${res.status()}: ${await res.text().catch(() => '')}`,
  ).toBeTruthy();
  return res.json();
}

async function apiDelete(page: PW, token: string, path: string) {
  await page.request.delete(`${API}${path}`, { headers: apiHeaders(token) });
  // Best-effort cleanup — ignore result
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

/**
 * Interactúa con un componente app-select:
 *  1. Hace click en el trigger (div[role="button"])
 *  2. Espera a que el CDK overlay panel se abra
 *  3. Hace click en la opción que coincide con el texto dado
 *
 * El panel se renderiza en .cdk-overlay-container fuera del árbol del componente.
 */
async function selectOption(page: PW, trigger: Locator, optionText: string | RegExp) {
  await trigger.click();
  // El panel CDK es app-select-panel, aparece en el overlay
  const panel = page.locator('app-select-panel').last();
  await panel.waitFor({ state: 'visible', timeout: 5000 });
  await panel.locator('ul.menu li label', { hasText: optionText }).first().click();
  // El panel se cierra tras seleccionar (single select)
  await panel.waitFor({ state: 'hidden', timeout: 3000 }).catch(() => {});
}

/**
 * Cambia el status de la vehicle instance via UI:
 *  1. Click en el status app-select del header (profile card)
 *  2. Selecciona la opción deseada
 *  3. Cambia a la pestaña "General Information" para exponer "Save Changes"
 *  4. Hace click en "Save Changes"
 *  5. Espera el toast de éxito
 */
async function changeStatusViaUI(page: PW, statusLabel: string | RegExp) {
  // El status select es el único app-select en el profile card (primera .card de la página)
  const profileCard = page.locator('.card').first();
  const statusSelectTrigger = profileCard.locator('app-select div[role="button"]');
  await selectOption(page, statusSelectTrigger, statusLabel);

  // Ir a la pestaña General para mostrar el botón "Save Changes"
  const generalTab = page.getByRole('button', { name: /general information/i });
  if (await generalTab.isVisible()) {
    await generalTab.click();
    await page.waitForTimeout(300);
  }

  // Guardar
  await page.getByRole('button', { name: /save changes/i }).click();

  // Esperar confirmación
  await expect(page.locator('.toast'), 'Save Changes must show a success toast').toContainText(
    /updated successfully/i,
    { timeout: 10000 },
  );
  await page.waitForTimeout(400);
}

/** Extrae el vehicleInstance ID del path de la URL actual */
function extractIdFromUrl(url: string): string {
  const match = url.match(/\/vehicles-instances\/([a-f0-9]{24})/);
  if (!match) throw new Error(`No se puede extraer el ID de la URL: ${url}`);
  return match[1];
}

// ─── Suite ────────────────────────────────────────────────────────────────────

test.describe('Vehicle Full Lifecycle — UI-driven E2E', () => {
  test(
    'recorrido completo: crear → inspeccionar → estimar → aprobación cliente → operaciones → checkout → re-entrada',
    async ({ page }) => {
      // ── 0. Login ──────────────────────────────────────────────────────────
      await loginAsAdmin(page);
      const token = await getToken(page);

      // ── 1. Setup: resolver IDs de prerrequisitos via API ───────────────────
      const tmplSearch = await apiPost(page, token, '/inspection-templates/search', {
        page: 1,
        limit: 20,
      });
      const templates: any[] = tmplSearch.data ?? [];
      const activeTemplate = templates.find((t: any) => t.active !== false) ?? templates[0];
      expect(activeTemplate, 'Requiere al menos una inspection template activa').toBeTruthy();
      const templateName: string = activeTemplate.name;

      const custSearch = await apiPost(page, token, '/customers/search', {
        page: 1,
        limit: 1,
      });
      const customers: any[] = custSearch.data ?? [];
      expect(customers.length, 'Requiere al menos un customer').toBeGreaterThan(0);
      const customerName: string =
        customers[0].name
          ? `${customers[0].name}${customers[0].company ? ' - ' + customers[0].company : ' - Private'}`
          : '';

      // IDs recogidos durante el test para teardown
      let vehicleId = '';
      let instance1Id = '';
      let instance2Id = '';
      const ivIds: string[] = [];
      const opIds: string[] = [];

      // Matrícula única para esta ejecución del test
      const suffix = Date.now().toString().slice(-7);
      const plate = `E2ELC${suffix}`;
      let jobCode = '';

      try {
        // ══════════════════════════════════════════════════════════════════
        // FASE 1 — Crear vehicle instance vía formulario UI
        // ══════════════════════════════════════════════════════════════════

        await page.goto('/vehicles-instances/new');
        await page.waitForLoadState('networkidle');

        // El formulario está visible y el botón Create está deshabilitado (campos vacíos)
        await expect(page.locator('input[placeholder="e.g. AB12 CDE"]')).toBeVisible();
        await expect(page.locator('input[placeholder="e.g. BMW"]')).toBeVisible();
        await expect(page.locator('input[placeholder="e.g. 320d M Sport"]')).toBeVisible();
        await expect(
          page.locator('button.btn-primary[disabled], button.btn-primary:disabled'),
          'Create button debe estar disabled con el formulario vacío',
        ).toBeVisible();

        // Rellenar la matrícula (dispara lookup después de 500ms debounce)
        await page.locator('input[placeholder="e.g. AB12 CDE"]').fill(plate);
        await page.waitForTimeout(800); // esperar debounce (no debe encontrar nada → nuevo vehículo)

        // Rellenar make y model
        await page.locator('input[placeholder="e.g. BMW"]').fill('E2E-Brand');
        await page.locator('input[placeholder="e.g. 320d M Sport"]').fill('LifecyclePro');

        // Rellenar mileage (el input con clase pr-11 es el de mileage en Reception Details)
        const mileageInput = page.locator('input[type="number"][class*="pr-11"]');
        await mileageInput.fill('20000');

        // Seleccionar cliente via app-select
        // El trigger del select de cliente muestra "Select a client..." como placeholder
        const customerTrigger = page.locator('app-select div[role="button"]', {
          hasText: /select a client/i,
        });
        await selectOption(page, customerTrigger, new RegExp(customers[0].name, 'i'));

        // Seleccionar inspection template via app-select
        // El trigger del template muestra "No template" como placeholder
        const templateTrigger = page.locator('app-select div[role="button"]', {
          hasText: /no template/i,
        });
        await selectOption(page, templateTrigger, new RegExp(templateName, 'i'));

        // El botón Create debe estar habilitado ahora
        await expect(
          page.locator('button.btn-primary:not([disabled])').filter({ hasText: /create/i }),
          'Create button debe habilitarse al rellenar todos los campos requeridos',
        ).toBeVisible({ timeout: 5000 });

        // Click Create → redirige al detail de la nueva instancia
        const navPromise = page.waitForURL(/\/vehicles-instances\/[a-f0-9]{24}$/);
        await page.getByRole('button', { name: /create/i }).click();
        await navPromise;
        await page.waitForLoadState('networkidle');

        // Extraer instance1Id de la URL
        instance1Id = extractIdFromUrl(page.url());
        expect(instance1Id, 'instance1Id debe existir tras crear').toBeTruthy();

        // Recuperar vehicleId vía API
        const inst1Data = await apiGet(page, token, `/vehicle-instances/${instance1Id}`);
        vehicleId =
          String(inst1Data.vehicleId ?? inst1Data.vehicle?._id ?? inst1Data.vehicle?.id ?? '');
        expect(vehicleId, 'vehicleId debe estar presente en la respuesta API').toBeTruthy();

        // ══════════════════════════════════════════════════════════════════
        // FASE 2 — Verificar estado checked_in en el detail page
        // ══════════════════════════════════════════════════════════════════

        // Matrícula en el h2 del header
        await expect(page.locator('h2').filter({ hasText: plate })).toBeVisible();

        // Status badge muestra "Checked In"
        await expect(page.locator('.status-badge').first()).toContainText(/checked in/i);

        // Job code visible y generado (no "N/A")
        const jobCodeEl = page.locator('p.font-mono.text-sm.font-bold.text-primary').first();
        await expect(jobCodeEl).toBeVisible();
        jobCode = (await jobCodeEl.textContent())?.trim() ?? '';
        expect(jobCode, 'El job code no debe ser N/A').toBeTruthy();
        expect(jobCode).not.toBe('N/A');

        // Mileage formateado visible
        await expect(page.locator('text=20,000')).toBeVisible();

        // Los 4 tabs están visibles
        await expect(page.getByRole('button', { name: /general information/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /^operations$/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /activity history/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /^inspection$/i })).toBeVisible();

        // ══════════════════════════════════════════════════════════════════
        // FASE 3 — Cambiar status → pending_inspection via UI
        // ══════════════════════════════════════════════════════════════════

        await changeStatusViaUI(page, /pending inspection/i);

        // Recargar para confirmar que el cambio persistió
        await page.goto(`/vehicles-instances/${instance1Id}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.status-badge').first()).toContainText(/pending inspection/i);

        // ══════════════════════════════════════════════════════════════════
        // FASE 4 — Página de inspección: marcar defecto y guardar
        // ══════════════════════════════════════════════════════════════════

        // Click en el tab "Inspection" → navega a /inspection/:id
        await page.getByRole('button', { name: /^inspection$/i }).click();
        await page.waitForLoadState('networkidle');
        expect(page.url()).toContain(`/inspection/${instance1Id}`);

        // Esperar a que los puntos de inspección carguen
        const firstPoint = page.locator('details.insp-point').first();
        await expect(firstPoint, 'Debe haber al menos un inspection point').toBeVisible({
          timeout: 15000,
        });

        // Marcar el primer punto como defecto (toggle-defect)
        const defectBtn = firstPoint.locator('button.insp-toggle.toggle-defect');
        await defectBtn.click();
        await expect(defectBtn).toHaveClass(/active/, { timeout: 3000 });

        // El contador de defectos debe ser > 0
        const defectCountEl = page.locator('.insp-status-stat.stat-defect .insp-stat-num');
        await expect(defectCountEl).not.toHaveText('0', { timeout: 3000 });

        // Guardar inspección
        await page.locator('button.insp-submit-btn').click();

        // Indicador de éxito en la página de inspección
        await expect(
          page.locator('.insp-save-success'),
          'La inspección debe guardarse con éxito',
        ).toBeVisible({ timeout: 10000 });

        // Recoger inspection value IDs para cleanup
        await page.waitForTimeout(500);
        const ivSearch = await apiPost(page, token, '/inspection-values/search', {
          page: 1,
          limit: 100,
          filters: { vehicleInstanceId: { value: instance1Id, operator: 'equals' } },
        });
        (ivSearch.data ?? []).forEach((iv: any) => ivIds.push(iv._id ?? iv.id));
        expect(ivIds.length, 'Debe haberse creado al menos un inspection value').toBeGreaterThan(0);

        // ══════════════════════════════════════════════════════════════════
        // FASE 4b — API: complete-inspection → pending_estimation
        // (No existe botón UI para este endpoint — la transición es explícita en backend)
        // ══════════════════════════════════════════════════════════════════

        const afterComplete = await apiPost(
          page,
          token,
          `/vehicle-instances/${instance1Id}/complete-inspection`,
          {},
        );
        expect(afterComplete.status, 'complete-inspection debe devolver pending_estimation').toBe(
          'pending_estimation',
        );

        // ══════════════════════════════════════════════════════════════════
        // FASE 5 — Verificar pending_estimation y pestaña de operaciones
        // ══════════════════════════════════════════════════════════════════

        await page.goto(`/vehicles-instances/${instance1Id}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.status-badge').first()).toContainText(/pending estimation/i);

        // Navegar a la pestaña Operations
        await page.getByRole('button', { name: /^operations$/i }).click();
        await page.waitForLoadState('networkidle');

        // Las operaciones se auto-crean a partir del inspection value rojo
        const opsSearch = await apiPost(page, token, '/operation-instances/search', {
          page: 1,
          limit: 100,
          filters: { vehicleInstanceId: { value: instance1Id, operator: 'equals' } },
        });
        const ops: any[] = opsSearch.data ?? [];
        expect(
          ops.length,
          'El inspection value rojo debe auto-crear ≥1 OperationInstance',
        ).toBeGreaterThan(0);
        ops.forEach((op: any) => opIds.push(op._id ?? op.id));

        // Progress bar visible
        await expect(page.locator('progress.progress-primary')).toBeVisible();

        // Al menos una fila de operaciones en la tabla
        const opRowsEstimation = page
          .locator('table tbody tr')
          .filter({ has: page.locator('app-select div[role="button"]') });
        await expect(
          opRowsEstimation.first(),
          'Debe haber al menos una operación en la tabla',
        ).toBeVisible({ timeout: 10000 });

        // El botón "Submit to Customer" visible (solo en pending_estimation con operaciones)
        await expect(
          page.getByRole('button', { name: /submit to customer/i }),
          '"Submit to Customer" debe ser visible en pending_estimation',
        ).toBeVisible();

        // ══════════════════════════════════════════════════════════════════
        // FASE 6 — Submit to Customer (UI button)
        // ══════════════════════════════════════════════════════════════════

        await page.getByRole('button', { name: /submit to customer/i }).click();

        // Toast de éxito
        await expect(page.locator('.toast')).toContainText(/submitted to customer/i, {
          timeout: 10000,
        });

        // Status badge actualizado a pending_approval
        await expect(page.locator('.status-badge').first()).toContainText(/pending approval/i, {
          timeout: 10000,
        });

        // "Submit to Customer" ya NO es visible
        await page.getByRole('button', { name: /^operations$/i }).click();
        await page.waitForTimeout(300);
        await expect(
          page.getByRole('button', { name: /submit to customer/i }),
          '"Submit to Customer" no debe ser visible en pending_approval',
        ).not.toBeVisible();

        // ══════════════════════════════════════════════════════════════════
        // FASE 7 — Customer Portal: el cliente revisa y aprueba reparaciones
        // ══════════════════════════════════════════════════════════════════

        await page.goto(`/customer-portal?vehicleInstanceId=${instance1Id}`);
        await page.waitForLoadState('networkidle');

        // ─ 7.1 Verificar header del portal ─────────────────────────────
        // Matrícula visible
        await expect(
          page.locator('p.font-black.text-xl').first(),
          'La matrícula del vehículo debe aparecer en el portal',
        ).toContainText(plate);

        // Make visible
        await expect(page.locator('p.text-xs.font-bold').first()).toContainText(/E2E-Brand/i);

        // ─ 7.2 Al menos un repair item listado ─────────────────────────
        const repairCards = page.locator('.card.bg-base-100').filter({
          has: page.locator('input.checkbox.checkbox-primary.checkbox-lg'),
        });
        await expect(
          repairCards.first(),
          'El portal debe mostrar ≥1 repair item del inspection value rojo',
        ).toBeVisible({ timeout: 10000 });

        const firstRepairCard = repairCards.first();

        // ─ 7.3 Estructura del repair item ──────────────────────────────
        // Nombre del item
        await expect(firstRepairCard.locator('h3.font-bold')).toBeVisible();

        // Badge de severidad (MAJOR o MINOR)
        await expect(
          firstRepairCard.locator('.badge').filter({ hasText: /major|minor/i }),
          'El badge de severidad debe ser MAJOR o MINOR',
        ).toBeVisible();

        // Coste estimado en formato £X.XX
        await expect(
          firstRepairCard.locator('p.text-2xl.font-black'),
          'El coste estimado debe mostrarse en formato £',
        ).toBeVisible();

        // ─ 7.4 Expandir desglose de costes ─────────────────────────────
        // DaisyUI collapse: clicar el collapse-title lo abre
        await firstRepairCard
          .locator('.collapse-title', { hasText: /view cost details/i })
          .click();

        await expect(firstRepairCard.locator('.collapse-content')).toBeVisible({ timeout: 3000 });

        // Las líneas de Parts y Labor están dentro del collapse
        await expect(firstRepairCard.locator('.collapse-content').locator('text=Parts')).toBeVisible();
        await expect(firstRepairCard.locator('.collapse-content').locator('text=Labor')).toBeVisible();

        // ─ 7.5 Marcar todos los items para aprobación ──────────────────
        const checkboxes = page.locator('input.checkbox.checkbox-primary.checkbox-lg');
        const checkboxCount = await checkboxes.count();
        expect(checkboxCount, 'Debe haber al menos un checkbox de repair item').toBeGreaterThan(0);

        for (let i = 0; i < checkboxCount; i++) {
          await checkboxes.nth(i).check({ force: true });
          await page.waitForTimeout(200);
        }

        // ─ 7.6 Sidebar: verificar resumen de costes ─────────────────────
        // El sidebar muestra los items seleccionados y el desglose
        const sidebar = page.locator('.lg\\:col-span-1').first();
        await expect(sidebar.locator('text=Parts')).toBeVisible({ timeout: 5000 });
        await expect(sidebar.locator('text=Labor')).toBeVisible();
        await expect(sidebar.locator('text=VAT')).toBeVisible();

        // El botón "Approve Repairs" debe estar visible en el sidebar
        await expect(
          page.locator('.btn-primary.btn-block.btn-lg'),
          '"Approve Repairs" debe aparecer cuando hay items seleccionados',
        ).toBeVisible({ timeout: 5000 });

        // ─ 7.7 Abrir modal de confirmación ─────────────────────────────
        await page.locator('.btn-primary.btn-block.btn-lg').click();

        const modal = page.locator('#confirm_modal');
        await expect(modal, 'El modal de confirmación debe abrirse').toBeVisible({ timeout: 5000 });

        // El modal muestra el número de items y el total
        await expect(modal).toContainText(String(checkboxCount));

        // ─ 7.8 Confirmar aprobación ─────────────────────────────────────
        await modal.getByRole('button', { name: /yes.*approve/i }).click();

        // Toast de éxito en el portal
        await expect(
          page.locator('.toast .alert-success'),
          'El portal debe mostrar un toast de éxito tras aprobar',
        ).toBeVisible({ timeout: 10000 });

        // ─ 7.9 Volver al detail y verificar pending_operations ──────────
        await page.goto(`/vehicles-instances/${instance1Id}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.status-badge').first()).toContainText(/pending operations/i, {
          timeout: 10000,
        });

        // ══════════════════════════════════════════════════════════════════
        // FASE 8 — Marcar todas las operaciones como "Completed" via UI
        // ══════════════════════════════════════════════════════════════════

        await page.getByRole('button', { name: /^operations$/i }).click();
        await page.waitForLoadState('networkidle');

        // Progress bar y tabla de operaciones visibles
        await expect(page.locator('progress.progress-primary')).toBeVisible();

        // Las filas de operaciones principales tienen el app-select de status
        const mainOpRows = page
          .locator('table tbody tr')
          .filter({ has: page.locator('app-select div[role="button"]') });
        const opRowCount = await mainOpRows.count();
        expect(opRowCount, 'Debe haber al menos una operación pendiente').toBeGreaterThan(0);

        // Marcar cada operación como Completed via el dropdown de status de la fila
        for (let i = 0; i < opRowCount; i++) {
          const row = mainOpRows.nth(i);
          const statusTrigger = row.locator('app-select div[role="button"]').first();
          await selectOption(page, statusTrigger, /^completed$/i);

          // Esperar toast de éxito de la operación individual
          await expect(page.locator('.toast')).toContainText(/operation updated/i, {
            timeout: 8000,
          });
          await page.waitForTimeout(500);
        }

        // ─ 8.1 Verificar auto-transición a ready_for_pickup ─────────────
        // El backend auto-transiciona cuando todas las ops están completed
        await page.waitForTimeout(1500);
        await page.reload();
        await page.waitForLoadState('networkidle');

        await expect(page.locator('.status-badge').first()).toContainText(/ready for pickup/i, {
          timeout: 15000,
        });

        // ─ 8.2 Progress bar al 100% ─────────────────────────────────────
        await page.getByRole('button', { name: /^operations$/i }).click();
        await page.waitForLoadState('networkidle');

        const progressEl = page.locator('progress.progress-primary');
        const progressValue = await progressEl.getAttribute('value');
        expect(Number(progressValue), 'El progress debe ser 100 con todas las ops completadas').toBe(100);

        // ══════════════════════════════════════════════════════════════════
        // FASE 9 — Checkout via UI status select
        // ══════════════════════════════════════════════════════════════════

        await changeStatusViaUI(page, /checked out/i);

        // Recargar para confirmar
        await page.goto(`/vehicles-instances/${instance1Id}`);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('.status-badge').first()).toContainText(/checked out/i);

        // ══════════════════════════════════════════════════════════════════
        // FASE 10 — Guard: completar una op en checked_out no revierte el status
        // ══════════════════════════════════════════════════════════════════

        if (opIds.length > 0) {
          await apiPatch(page, token, `/operation-instances/${opIds[0]}`, { status: 'pending' });
          await apiPatch(page, token, `/operation-instances/${opIds[0]}`, { status: 'completed' });
          const guardResult = await apiGet(page, token, `/vehicle-instances/${instance1Id}`);
          expect(
            guardResult.status,
            'Completar una op en checked_out NO debe revertir el status',
          ).toBe('checked_out');
        }

        // ══════════════════════════════════════════════════════════════════
        // FASE 11 — Listing: fila con checked_out visible
        // ══════════════════════════════════════════════════════════════════

        await page.goto('/vehicles-instances');
        await page.waitForLoadState('networkidle');

        // Buscar por matrícula en el data grid
        await page.locator('input.input-bordered').first().fill(plate);
        await page.waitForTimeout(700);

        const outRow = page.locator('tr', { has: page.locator(`text=${plate}`) }).first();
        await expect(outRow, 'La fila con la matrícula debe ser visible en el listing').toBeVisible();
        await expect(
          outRow.locator('text=Checked Out'),
          'El status Checked Out debe mostrarse en el listing',
        ).toBeVisible();

        // ══════════════════════════════════════════════════════════════════
        // FASE 12 — Pestaña History: todas las transiciones de estado visibles
        // ══════════════════════════════════════════════════════════════════

        await page.goto(`/vehicles-instances/${instance1Id}`);
        await page.waitForLoadState('networkidle');
        await page.getByRole('button', { name: /activity history/i }).click();
        await page.waitForLoadState('networkidle');

        // Todos los labels de status deben aparecer en la timeline
        const expectedStatusLabels = [
          'Pending Inspection',
          'Pending Estimation',
          'Pending Approval',
          'Pending Operations',
          'Ready For Pickup',
          'Checked Out',
        ];
        for (const label of expectedStatusLabels) {
          await expect(
            page.locator(`text=${label}`).first(),
            `La pestaña History debe mostrar el evento "${label}"`,
          ).toBeVisible({ timeout: 5000 });
        }

        // API: verificar integridad del activity timeline
        const timeline = await apiGet(page, token, `/vehicle-instances/${instance1Id}/activity`);
        const hasCreatedEvent = (timeline.data ?? []).some(
          (e: any) => e.type === 'vehicle_instance_created',
        );
        expect(hasCreatedEvent, 'El timeline debe incluir vehicle_instance_created').toBeTruthy();

        const statusEvents: any[] = (timeline.data ?? []).filter(
          (e: any) => e.type === 'status_changed',
        );
        const toStatuses: string[] = statusEvents.map((e: any) => e.metadata?.toStatus);
        for (const s of [
          'pending_inspection',
          'pending_estimation',
          'pending_approval',
          'pending_operations',
          'ready_for_pickup',
          'checked_out',
        ]) {
          expect(toStatuses, `El timeline debe registrar la transición a ${s}`).toContain(s);
        }

        // ══════════════════════════════════════════════════════════════════
        // FASE 13 — Re-entrada: el mismo vehículo entra de nuevo via formulario UI
        // ══════════════════════════════════════════════════════════════════

        await page.goto('/vehicles-instances/new');
        await page.waitForLoadState('networkidle');

        // Escribir la misma matrícula — el lookup detecta el vehículo existente
        await page.locator('input[placeholder="e.g. AB12 CDE"]').fill(plate);
        await page.waitForTimeout(800); // esperar debounce y respuesta del lookup

        // Banner "Vehicle already exists" aparece
        await expect(
          page.locator('text=Vehicle already exists'),
          'Debe aparecer el banner "Vehicle already exists" para la matrícula conocida',
        ).toBeVisible({ timeout: 10000 });

        // El formulario muestra datos del vehículo existente (make y model auto-rellenados)
        await expect(page.locator('input[placeholder="e.g. BMW"]')).toHaveValue('E2E-Brand');

        // Click "Use this vehicle"
        await page.getByRole('button', { name: /use this vehicle/i }).click();

        // Banner verde "Linked to existing vehicle"
        await expect(
          page.locator('text=Linked to existing vehicle'),
          'Debe aparecer el banner verde de vínculo al vehículo existente',
        ).toBeVisible({ timeout: 5000 });

        // Seleccionar cliente (mismo que antes)
        const reentryCustomerTrigger = page.locator('app-select div[role="button"]', {
          hasText: /select a client/i,
        });
        await selectOption(page, reentryCustomerTrigger, new RegExp(customers[0].name, 'i'));

        // Seleccionar inspection template
        const reentryTemplateTrigger = page.locator('app-select div[role="button"]', {
          hasText: /no template/i,
        });
        await selectOption(page, reentryTemplateTrigger, new RegExp(templateName, 'i'));

        // Actualizar mileage para la re-entrada
        const reentryMileage = page.locator('input[type="number"][class*="pr-11"]');
        await reentryMileage.clear();
        await reentryMileage.fill('23500');

        // Click Create → nueva instancia
        const reentryNav = page.waitForURL(/\/vehicles-instances\/[a-f0-9]{24}$/);
        await page.getByRole('button', { name: /create/i }).click();
        await reentryNav;
        await page.waitForLoadState('networkidle');

        instance2Id = extractIdFromUrl(page.url());
        expect(instance2Id, 'instance2Id debe ser distinto de instance1Id').toBeTruthy();
        expect(instance2Id).not.toBe(instance1Id);

        // ══════════════════════════════════════════════════════════════════
        // FASE 13b — Verificar el detail de la instancia de re-entrada
        // ══════════════════════════════════════════════════════════════════

        // Misma matrícula
        await expect(page.locator('h2').filter({ hasText: plate })).toBeVisible();

        // Status fresco: checked_in
        await expect(page.locator('.status-badge').first()).toContainText(/checked in/i);

        // Nuevo job code (distinto al de la primera instancia)
        const reentryJobCodeEl = page.locator('p.font-mono.text-sm.font-bold.text-primary').first();
        await expect(reentryJobCodeEl).toBeVisible();
        const reentryJobCode = (await reentryJobCodeEl.textContent())?.trim() ?? '';
        expect(reentryJobCode, 'El job code de la re-entrada debe ser diferente').toBeTruthy();
        expect(reentryJobCode).not.toBe(jobCode);

        // Mileage actualizado
        await expect(page.locator('text=23,500')).toBeVisible();

        // El historial empieza limpio: sin eventos checked_out heredados
        const newTimeline = await apiGet(
          page,
          token,
          `/vehicle-instances/${instance2Id}/activity`,
        );
        const newCheckedOutEvents = (newTimeline.data ?? []).filter(
          (e: any) => e.type === 'status_changed' && e.metadata?.toStatus === 'checked_out',
        );
        expect(
          newCheckedOutEvents.length,
          'La re-entrada NO debe heredar el evento checked_out de la instancia anterior',
        ).toBe(0);

        // La historia de la re-entrada solo tiene el evento de creación (y ningún status_changed a checked_out)
        expect(
          newTimeline.total ?? (newTimeline.data ?? []).length,
          'La re-entrada debe tener ≥1 evento (creación)',
        ).toBeGreaterThanOrEqual(1);

        // ══════════════════════════════════════════════════════════════════
        // FASE 14 — Listing: ambas instancias visibles con sus estados correctos
        // ══════════════════════════════════════════════════════════════════

        await page.goto('/vehicles-instances');
        await page.waitForLoadState('networkidle');
        await page.locator('input.input-bordered').first().fill(plate);
        await page.waitForTimeout(700);

        const allRows = page.locator('tr', { has: page.locator(`text=${plate}`) });
        const rowCount = await allRows.count();
        expect(rowCount, 'Deben aparecer ≥2 filas con la misma matrícula').toBeGreaterThanOrEqual(2);

        // Ambas instancias representan estados diferentes
        const rowTexts = await allRows.allInnerTexts();
        const hasCheckedOut = rowTexts.some((t) => t.includes('Checked Out'));
        const hasCheckedIn = rowTexts.some((t) => t.includes('Checked In'));
        expect(hasCheckedOut, 'Una fila debe mostrar "Checked Out"').toBeTruthy();
        expect(hasCheckedIn, 'La otra fila debe mostrar "Checked In"').toBeTruthy();

        // API: ambas instancias comparten el mismo vehicleId
        const allInstSearch = await apiPost(page, token, '/vehicle-instances/search', {
          page: 1,
          limit: 200,
        });
        const forVehicle: any[] = (allInstSearch.data ?? []).filter((i: any) => {
          const vid =
            String(i.vehicleId ?? '') ||
            String(i.vehicle?._id ?? '') ||
            String(i.vehicle?.id ?? '');
          return vid === vehicleId;
        });
        expect(forVehicle.length, 'El mismo vehículo debe tener ≥2 instancias').toBeGreaterThanOrEqual(2);
        const returnedIds = forVehicle.map((i: any) => i._id ?? i.id);
        expect(returnedIds).toContain(instance1Id);
        expect(returnedIds).toContain(instance2Id);
      } finally {
        // ── Cleanup — se ejecuta siempre, incluso si el test falla ────────
        for (const opId of opIds) {
          await apiDelete(page, token, `/operation-instances/${opId}`);
        }
        for (const ivId of ivIds) {
          await apiDelete(page, token, `/inspection-values/${ivId}`);
        }
        if (instance2Id) await apiDelete(page, token, `/vehicle-instances/${instance2Id}`);
        if (instance1Id) await apiDelete(page, token, `/vehicle-instances/${instance1Id}`);
        if (vehicleId) await apiDelete(page, token, `/vehicles/${vehicleId}`);
      }
    },
  );
});
