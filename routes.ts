import type { Route } from '../types';
const r = (id:string,title:string,description:string,category: Route['category'],full:string[],short:string[]): Route =>
 ({id,slug:id,title,description,category,fullVersion:{stopIds:full},shortVersion:{stopIds:short},orderedStopIds:full,sources:[],contentStatus:'demo'});
export const routes: Route[] = [
 r('heart','Сердце Москвы: Красная площадь и Кремль','Главный ансамбль города.','historic',['kremlin','red-square','st-basil','gum','kazan-cathedral'],['red-square','st-basil','gum']),
 r('arbat','Старый Арбат: литература и городские истории','Прогулка по Арбату.','literary',['tsoi-wall','arbat-monument','arbat-pushkin'],['tsoi-wall','arbat-pushkin']),
 r('kitay','Китай-город и Зарядье: древняя торговая Москва','От Варварки до парка.','historic',['kazan-cathedral','english-court','zaryadye'],['english-court','zaryadye']),
 r('zamoskvorechye','Замоскворечье: старые переулки','Тихая сторона за рекой.','historic',['zamoskvorechye-lane','tretyakov'],['tretyakov']),
 r('bulgakov','Булгаковская Москва','Патриаршие и литературные адреса.','literary',['patriarshy','bulgakov-museum'],['patriarshy']),
];
