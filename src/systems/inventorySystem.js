/**
 * inventorySystem.js
 * -----------------------------------------------------------------------------
 * Reglas PURAS de la tienda: qué se puede comprar, qué se puede equipar y qué
 * cuesta. Sin React y sin localStorage, igual que `scoringSystem` y `missionSystem`.
 *
 * Aquí vive la respuesta a "¿puedo?"; el "hazlo" (cobrar y guardar) está en
 * `useInventory`, que es quien toca el almacenamiento.
 *
 * Las cuatro reglas que impiden que la tienda se rompa:
 *   1. No se compra algo que no está en el catálogo.
 *   2. No se compra dos veces lo mismo (ni se cobra dos veces).
 *   3. No se compra sin saldo suficiente.
 *   4. No se equipa algo que no está desbloqueado.
 * -----------------------------------------------------------------------------
 */

/** Motivos por los que una compra puede rechazarse (para dar el mensaje exacto). */
export const DENY = {
  UNKNOWN: 'unknown', // el id no existe en el catálogo
  OWNED: 'owned', // ya lo tienes
  FUNDS: 'funds', // no te llegan los huesos
  PRICE: 'price', // precio no válido (defensivo)
}

/**
 * ¿Se puede comprar este artículo?
 * @returns {{ ok:true, price:number } | { ok:false, reason:string, missing?:number }}
 */
export function canBuy(item, owned, bones) {
  if (!item || !item.id) return { ok: false, reason: DENY.UNKNOWN }
  // Un precio negativo o no numérico convertiría "comprar" en "fabricar huesos".
  const price = Number(item.price)
  if (!Number.isFinite(price) || price < 0) return { ok: false, reason: DENY.PRICE }
  if (owned.includes(item.id)) return { ok: false, reason: DENY.OWNED }
  if (bones < price) return { ok: false, reason: DENY.FUNDS, missing: price - bones }
  return { ok: true, price }
}

/** ¿Se puede equipar? Solo lo que ya está en propiedad. */
export function canEquip(item, owned) {
  return Boolean(item && item.id && owned.includes(item.id))
}

/**
 * Estado de un artículo para pintarlo en la tienda.
 * @returns {'equipped'|'owned'|'affordable'|'locked'}
 */
export function itemState(item, owned, equippedId, bones) {
  if (!item) return 'locked'
  if (item.id === equippedId) return 'equipped'
  if (owned.includes(item.id)) return 'owned'
  return bones >= item.price ? 'affordable' : 'locked'
}

/**
 * Cuántos artículos del catálogo se podrían comprar AHORA MISMO. Lo usa el menú
 * para avisar de que hay algo esperando (y solo entonces).
 */
export function affordableCount(catalog, owned, bones) {
  return catalog.filter((i) => !owned.includes(i.id) && bones >= i.price).length
}

/** El artículo más barato que aún no tienes (para sugerir un objetivo de ahorro). */
export function cheapestLocked(catalog, owned) {
  return (
    catalog
      .filter((i) => !owned.includes(i.id))
      .sort((a, b) => a.price - b.price)[0] || null
  )
}
