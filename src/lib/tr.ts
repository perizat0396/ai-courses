/** Выбор текста по языку для клиентских компонентов админки (язык передаётся пропом). */
export const tr = (kk: boolean | undefined) => (ru: string, kz: string) => (kk ? kz : ru);
