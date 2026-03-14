/**
 * クリニックID設定（共通）
 * 将来的にはログインユーザーの所属院から動的に取得する。
 */
const DEFAULT_CLINIC_ID = '00000000-0000-0000-0000-000000000001'

export function getClinicId(): string {
  return process.env.NEXT_PUBLIC_CLINIC_ID || DEFAULT_CLINIC_ID
}
