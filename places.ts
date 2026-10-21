import type { Place } from '../types';
// ВАЖНО: координаты приблизительные, тексты — краткие демонстрационные. Требуется проверка по источникам.
type In = Omit<Place,'facts'|'sources'|'contentStatus'|'historyFull'> & {historyFull?: string; facts?: Place['facts']};
const mk = (p: In): Place =>
  ({ facts: [], sources: [], contentStatus: 'demo', historyFull: p.descriptionShort + ' Демонстрационный материал — требуется проверка.', ...p });
export const places: Place[] = [
 mk({id:'red-square',name:'Красная площадь',address:'Красная площадь, Москва',latitude:55.7539,longitude:37.6208,categories:['historic','soviet'],descriptionShort:'Главная площадь Москвы рядом со стенами Кремля.'}),
 mk({id:'kremlin',name:'Московский Кремль',address:'Московский Кремль, Москва',latitude:55.7520,longitude:37.6175,categories:['historic','architecture'],descriptionShort:'Древнейшая часть Москвы и крепостной ансамбль на Боровицком холме.'}),
 mk({id:'st-basil',name:'Собор Василия Блаженного',address:'Красная площадь, 7',latitude:55.7525,longitude:37.6231,categories:['temples','architecture'],constructionYear:'1555–1561',descriptionShort:'Храм на Красной площади, построенный при Иване IV.',facts:[{text:'Авторство собора традиционно связывают с зодчими Бармой и Постником; вопрос остаётся предметом дискуссий.',kind:'disputed'}]}),
 mk({id:'gum',name:'ГУМ',address:'Красная площадь, 3',latitude:55.7547,longitude:37.6215,categories:['architecture','historic'],constructionYear:'1890-е',architect:'А. Н. Померанцев (при участии В. Г. Шухова)',descriptionShort:'Здание Верхних торговых рядов на Красной площади.'}),
 mk({id:'arbat-pushkin',name:'Мемориальная квартира А. С. Пушкина',address:'Арбат, 53',latitude:55.7494,longitude:37.5921,categories:['literary','museums'],descriptionShort:'Дом на Арбате, связанный с жизнью Пушкина после женитьбы.'}),
 mk({id:'arbat-monument',name:'Памятник Пушкину и Гончаровой',address:'Арбат, 53 (у дома)',latitude:55.7492,longitude:37.5911,categories:['literary','unusual'],descriptionShort:'Скульптурная композиция на Старом Арбате.'}),
 mk({id:'tsoi-wall',name:'Стена Цоя',address:'Кривоарбатский пер.',latitude:55.7497,longitude:37.5917,categories:['soviet','unusual'],descriptionShort:'Стена-мемориал, возникшая стихийно после гибели Виктора Цоя в 1990 году.'}),
 mk({id:'zaryadye',name:'Парк «Зарядье»',address:'ул. Варварка, 6',latitude:55.7512,longitude:37.6289,categories:['parks','unusual'],constructionYear:'2017',descriptionShort:'Парк рядом с Кремлём, открытый в 2017 году на месте исторического района Зарядье.'}),
 mk({id:'english-court',name:'Старый Английский двор',address:'ул. Варварка, 4а',latitude:55.7510,longitude:37.6262,categories:['historic','museums'],descriptionShort:'Палаты в Китай-городе, связанные с историей торговли с Англией.'}),
 mk({id:'kazan-cathedral',name:'Казанский собор',address:'Никольская ул., 3',latitude:55.7556,longitude:37.6218,categories:['temples','historic'],descriptionShort:'Храм у Красной площади, воссозданный в 1990-е годы.'}),
 mk({id:'tretyakov',name:'Государственная Третьяковская галерея',address:'Лаврушинский пер., 10',latitude:55.7415,longitude:37.6208,categories:['museums','architecture'],descriptionShort:'Художественный музей, основанный на коллекции Павла Третьякова.'}),
 mk({id:'zamoskvorechye-lane',name:'Лаврушинский переулок',address:'Лаврушинский пер.',latitude:55.7420,longitude:37.6205,categories:['historic'],descriptionShort:'Старинный переулок Замоскворечья.'}),
 mk({id:'patriarshy',name:'Патриаршие пруды',address:'Патриарший пер.',latitude:55.7640,longitude:37.5934,categories:['literary','parks','legends'],descriptionShort:'Место действия начала романа «Мастер и Маргарита».',facts:[{text:'Мотив запрета разговаривать с незнакомцами — литературный и городской миф, не исторический факт.',kind:'legend'}]}),
 mk({id:'bulgakov-museum',name:'Музей М. А. Булгакова',address:'Б. Садовая ул., 10',latitude:55.7690,longitude:37.5957,categories:['literary','museums'],descriptionShort:'Музей в доме, где жил писатель.'}),
];
