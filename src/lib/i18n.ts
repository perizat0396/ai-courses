import { cookies } from 'next/headers';

export type Lang = 'ru' | 'kk';

const ru = {
  appName: 'AI Курсы',
  hello: 'Здравствуйте',
  dashboard: 'Мои курсы',
  profile: 'Профиль',
  admin: 'Админка',
  logout: 'Выйти',
  login: 'Войти',
  register: 'Регистрация',
  email: 'Email',
  password: 'Пароль',
  fullName: 'Имя и фамилия',
  noAccount: 'Нет аккаунта?',
  haveAccount: 'Уже есть аккаунт?',
  createAccount: 'Создать аккаунт',
  loginTitle: 'Вход на платформу',
  loginSub: 'Курсы по искусственному интеллекту',
  registerDone: 'Аккаунт создан. Нажмите «Войти» и введите email и пароль.',
  registerDoneCode: 'Аккаунт создан, курс открыт. Нажмите «Войти» и введите email и пароль.',
  joinHint: 'Регистрация на курс. Заполните три поля и нажмите «Создать аккаунт».',
  joinBad: 'Ссылка на курс устарела. Обратитесь к преподавателю.',
  youHaveCourses: (n: number) => `У вас ${n} ${plural(n, 'курс', 'курса', 'курсов')}`,
  noCourses: 'Пока нет открытых курсов',
  noCoursesHint: 'Доступ к курсам выдаёт преподаватель. Сообщите ей email, с которым вы зарегистрировались:',
  progress: 'Прогресс',
  lessons: 'уроков',
  continue: 'Продолжить',
  start: 'Начать',
  lesson: 'Урок',
  module: 'Модуль',
  materials: 'Материалы',
  download: 'Скачать',
  quiz: 'Тест',
  checkAnswers: 'Проверить',
  tryAgain: 'Пройти ещё раз',
  result: 'Результат',
  assignment: 'Задание',
  yourAnswer: 'Ваш ответ',
  attachFile: 'Прикрепить файл',
  send: 'Отправить',
  sent: 'Отправлено',
  status_submitted: 'На проверке',
  status_accepted: 'Принято',
  status_needs_work: 'Нужно доработать',
  teacherFeedback: 'Комментарий преподавателя',
  markDone: 'Отметить как пройденный',
  done: 'Пройдено',
  prev: 'Назад',
  next: 'Далее',
  backToCourse: 'К программе курса',
  min: 'мин',
  saved: 'Сохранено',
  save: 'Сохранить',
  error: 'Ошибка',
  noAccess: 'У вас нет доступа к этому курсу',
  aiHelper: 'ИИ-помощник',
  aiHello: 'Здравствуйте! Я помогу разобраться с этим уроком. Спросите что угодно по теме — объясню проще, приведу пример или подскажу с заданием.',
  aiPlaceholder: 'Ваш вопрос…',
  aiThinking: 'Думаю…',
  aiQuick1: 'Объясни этот урок проще',
  aiQuick2: 'Приведи пример промпта',
  aiQuick3: 'С чего начать задание?',
  aiNote: 'ИИ может ошибаться. Не отправляйте ему личные и служебные данные.',
  aiReview: 'Предварительный отзыв ИИ',
  aiReviewNote: 'Это автоматическая подсказка. Итоговую оценку ставит преподаватель.',
  aiChecking: 'ИИ проверяет ответ…',
  aiRecheck: 'Проверить ИИ ещё раз',
  roleAdmin: 'Администратор',
  badLogin: 'Неверный email или пароль',
  aiOff: 'ИИ не настроен',
  aiReviewLimit: 'Лимит проверок ИИ на сегодня исчерпан',
  aiDown: 'ИИ временно недоступен',
};

const kk: typeof ru = {
  appName: 'ЖИ курстары',
  hello: 'Сәлеметсіз бе',
  dashboard: 'Менің курстарым',
  profile: 'Профиль',
  admin: 'Әкімші панелі',
  logout: 'Шығу',
  login: 'Кіру',
  register: 'Тіркелу',
  email: 'Email',
  password: 'Құпиясөз',
  fullName: 'Аты-жөні',
  noAccount: 'Аккаунт жоқ па?',
  haveAccount: 'Аккаунт бар ма?',
  createAccount: 'Аккаунт құру',
  loginTitle: 'Платформаға кіру',
  loginSub: 'Жасанды интеллект бойынша курстар',
  registerDone: 'Аккаунт құрылды. «Кіру» батырмасын басып, email мен құпиясөзді енгізіңіз.',
  registerDoneCode: 'Аккаунт құрылды, курс ашық. «Кіру» батырмасын басып, email мен құпиясөзді енгізіңіз.',
  joinHint: 'Курсқа тіркелу. Үш жолды толтырып, «Аккаунт құру» батырмасын басыңыз.',
  joinBad: 'Курс сілтемесі ескірген. Оқытушыға хабарласыңыз.',
  youHaveCourses: (n: number) => `Сізде ${n} курс бар`,
  noCourses: 'Әзірге ашық курстар жоқ',
  noCoursesHint: 'Курстарға қолжетімділікті оқытушы береді. Тіркелген email-іңізді оқытушыға жіберіңіз:',
  progress: 'Үлгерім',
  lessons: 'сабақ',
  continue: 'Жалғастыру',
  start: 'Бастау',
  lesson: 'Сабақ',
  module: 'Модуль',
  materials: 'Материалдар',
  download: 'Жүктеу',
  quiz: 'Тест',
  checkAnswers: 'Тексеру',
  tryAgain: 'Қайта өту',
  result: 'Нәтиже',
  assignment: 'Тапсырма',
  yourAnswer: 'Сіздің жауабыңыз',
  attachFile: 'Файл тіркеу',
  send: 'Жіберу',
  sent: 'Жіберілді',
  status_submitted: 'Тексерілуде',
  status_accepted: 'Қабылданды',
  status_needs_work: 'Пысықтау керек',
  teacherFeedback: 'Оқытушының пікірі',
  markDone: 'Өтілді деп белгілеу',
  done: 'Өтілді',
  prev: 'Артқа',
  next: 'Келесі',
  backToCourse: 'Курс бағдарламасына',
  min: 'мин',
  saved: 'Сақталды',
  save: 'Сақтау',
  error: 'Қате',
  noAccess: 'Бұл курсқа қолжетімділігіңіз жоқ',
  aiHelper: 'ЖИ-көмекші',
  aiHello: 'Сәлеметсіз бе! Осы сабақты түсінуге көмектесемін. Тақырып бойынша кез келген сұрақ қойыңыз — қарапайым түсіндіремін, мысал келтіремін немесе тапсырмаға кеңес беремін.',
  aiPlaceholder: 'Сұрағыңыз…',
  aiThinking: 'Ойланып жатырмын…',
  aiQuick1: 'Осы сабақты қарапайым түсіндірші',
  aiQuick2: 'Промпт мысалын келтірші',
  aiQuick3: 'Тапсырманы неден бастаймын?',
  aiNote: 'ЖИ қателесуі мүмкін. Оған жеке және қызметтік деректерді жібермеңіз.',
  aiReview: 'ЖИ-дің алдын ала пікірі',
  aiReviewNote: 'Бұл автоматты кеңес. Қорытынды бағаны оқытушы қояды.',
  aiChecking: 'ЖИ жауапты тексеруде…',
  aiRecheck: 'ЖИ-ге қайта тексерту',
  roleAdmin: 'Әкімші',
  badLogin: 'Email немесе құпиясөз қате',
  aiOff: 'ЖИ бапталмаған',
  aiReviewLimit: 'Бүгінгі ЖИ тексеру лимиті таусылды',
  aiDown: 'ЖИ уақытша қолжетімсіз',
};

export type Dict = typeof ru;
const dicts: Record<Lang, Dict> = { ru, kk };

function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export async function getLang(): Promise<Lang> {
  const c = await cookies();
  return c.get('lang')?.value === 'kk' ? 'kk' : 'ru';
}

export async function getDict() {
  const lang = await getLang();
  return { lang, t: dicts[lang] };
}

/** Поле контента на нужном языке с запасным вариантом на русском. */
export function pick<T extends Record<string, unknown>>(row: T, field: string, lang: Lang): string {
  const v = row[`${field}_${lang}`];
  if (typeof v === 'string' && v.trim()) return v;
  const fallback = row[`${field}_ru`];
  return typeof fallback === 'string' ? fallback : '';
}

export function pickArr<T extends Record<string, unknown>>(row: T, field: string, lang: Lang): string[] {
  const v = row[`${field}_${lang}`];
  if (Array.isArray(v) && v.length) return v as string[];
  return (row[`${field}_ru`] as string[]) ?? [];
}
