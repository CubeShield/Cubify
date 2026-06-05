![](readme/header.png)

# `Cubify` ✨

[![Go](https://img.shields.io/badge/Go-%2300ADD8.svg?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![ReactJS](https://img.shields.io/badge/-ReactJs-61DAFB?logo=react&logoColor=white&style=for-the-badge)

![](readme/preview.png)

Это самое крутое, что вы видели, а именно имбовейший лаунчер по майнкрафту для проектов **CubeShield** 😇😇😇

### ⚡️ **Если вы просто хотите играть, вам сюда** - **[Последний релиз!!!](https://github.com/CubeShield/Cubify/releases/latest)**

## `Почему это - имба?` 🔥

![](readme/info.png)

- **Теперь вы можете играть где хотите:** не важно с Windows, MacOS, Linux вы будете получать одинаковый пользовательский опыт от использования лаунчера

- **Легко в освоении.** Всё, что необходимо - скачать лаунчер, запустить его, войти в аккаунт (либо написать создать оффлайн-профиль, написав ник), выбрать сборку и нажать играть. Скачивание Minecraft и Java берёт на себя лаунчер

- **Работает всегда**, потому что все данные о сборках и их индексы (подробнее ниже) хранятся на GitHub, а значит CubeShield не будет тратить никаких ресурсов на поддержание сторонних API, в придачу получаем крутую систему версионирования, релизов и истории изменений

- **прикольььььно**, ваще написано на стеке GoLang + TypeScript, что круто: даёт крутую кроссплатформу и дешевизну разработки

- **Кастомизация сборок.** Раньше было запарно добавить даже один модик, надо было искать ссылку на мод, скачивать его, лезть в папку сборки и перемещать мод в эту папку. Теперь просто вставьте ссылку на скачивание мода с сайта Modrinth формата `https://modrinth.com/mod/skinrestorer/version/2.6.0+1.21.11-fabric` с версией, а его установку самостоятельно выполнит лаунчер, также и с CurseForge. Либо если вы старовер, можете добавить мод, перетащив его в папку сборки

- **Настроечки**, в которых можно менять ОЗУ под ваш Minecraft, тип сборки и много чего ещё, просто зайдите туда

- **Режим разработки:** помимо всего функционала есть режим разработки, который упрощает разработку новой сборки в сотни раз. Для его работы нужен Git, а там уже можно разобраться. Поддерживается деплой на сервер через FTP

## `Как это работает под капотом` 😇

В основе лежат две штуки: `Instance` и `Index`

**Index** - обычный Git репозиторий, хранящийся на GitHub, содержащий в себе `index.json`, который уже является этакой сборной солянкой всех сборок, по сути как список пакетов, доступных к установке

Репозиторий выглядит так

```bash
.
└── index.json
```

А сам `index.json`:

```json
{
    "provider_name": "CubeStudio Official", # Название источника
    "instances": ["CubeShield/CubeShieldX-Instance", "CubeShield/CubeShield8-Instance"] # Репозитории Instance
}
```

Сам этот файлик берётся напрямую из main ветки (без релизов и тд), то есть если мы говорим про то, где лежит индекс, то правильно будет сказать так: `https://raw.githubusercontent.com/CubeShield/CubeInstances/refs/heads/main/index.json`

В настройках по умолчанию именно такой и указан, как понятно, их может быть несколько, можно создать свой и передавать в нём ваши сборки

**Instance** - обычный Git репозиторий, хранящийся на GitHub, содержащий в себе много интересного, по факту обычная сборка в нашем понимании

Обычный репозиторий выглядит так:

```bash
.
├── .github
│   └── workflows
│       └── release.yml # Среда разработки релизов
├── instance.json # Информация о сборке
├── logo.png # Фоточка
└── release_message.txt # История изменений релиза
```

Теперь копнём в `instance.json`, по сути это `Meta`, здесь хранится недоработанная версии сборки, способная к запуску (снапшот)

```json
{
  "name": "CubeShield X", # Название
  "description": "Здесь крутое описание", # Описание
  "loader": "fabric", # Загрузчик, можно и без указания, тогда: ""
  "loader_version": "", # Версия загрузчика, можно и без указания, тогда: ""
  "minecraft_version": "1.20.1", # Версия майнкрафта
  "image_url": "https://raw.githubusercontent.com/CubeShield/CubeShieldX-Instance/main/logo.png", # Ссылка на фоточку
  "containers": [
    ...
  ]
}
```

Новая сущность - **контейнеры**, проще говоря директория (папка, путь), которая простраивается из корня сборки, например:

```bash
.
├── assets
├── bin
├── command_history.txt
├── config
├── data
├── defaultconfigs
├── downloads
├── editor
├── installed.json
├── instance.json
├── libraries
├── logs
├── mods # только этой сборки
├── options.txt
├── realms_persistence.json
├── resourcepacks
├── saves
├── schematics
├── servers.dat
├── servers.dat_old
├── versions
├── villagerpacks
├── xaero
└── XaeroWaypoints_BACKUP240807
```

Если тип контента `mods`, то он будет соответствовать здесь директории `./mods`

Рассмотрим условный список модов:

```json
{
	"content_type": "mods", # Тип контента контейнера = директория
    "rewrite": false # WIP, полная перезапись контента каждый раз, даже если он не изменился, полезно для конфигов
	"content": [
		{
			"name": "Fabric API", # Отображаемое имя контента
			"image_url": "https://cdn.modrinth.com/data/P7dR8mSH/icon.png", # Ссылка на фоточку
			"type": "both", # Тип контента both/client/server
			"mod_id": "fabric-api", # ModID, если source modrinth/curseforge, для обновления модов
			"file_id": "0.141.3+1.21.11", # FileID, если source modrinth/curseforge, для обновления модов
			"source": "modrinth", # Источник мода modrinth/curseforge/local
			"file": "fabric-api-0.141.3+1.21.11.jar", # Название файла, в который будет сохранен контент в контейнере, например здесь mods/fabric-api-0.141.3+1.21.11.jar
			"url": "https://cdn.modrinth.com/data/P7dR8mSH/versions/i5tSkVBH/fabric-api-0.141.3%2B1.21.11.jar" # Ссылка на контент
		},
		{
			"name": "Create Fly",
			"image_url": "https://cdn.modrinth.com/data/dKvj0eNn/a1e1ad6f018c3a47cb300edbf0ebebce894bfd45_96.webp",
			"type": "both",
			"mod_id": "create-fly",
			"file_id": "1.21.11-6.0.9-5",
			"source": "modrinth",
			"file": "create-fly-1.21.11-6.0.9-5.jar",
			"url": "https://cdn.modrinth.com/data/dKvj0eNn/versions/fn0H9rSj/create-fly-1.21.11-6.0.9-5.jar"
		}
	],
    "containers": [ # WIP, вкладывание контейнеров в контейнер, например удобно в случае config/somemod/...
        ...
    ]
}
```

Данная система помогает легко доставлять контент на устройства и использовалась в **CLI обновлялке на Go ([CubeHopper](https://github.com/CubeShield/CubeHopper))** в связке со старым **API на Python ([Cube-API](https://github.com/CubeShield/Cube-API))**, которая уже в свою очередь работало с **обновлялками на Kotlin ([CubeRestart](https://github.com/CubeShield/CubeRestart))** и **Java ([CubeStart](https://github.com/CubeShield/CubeStart))**

Профитов много, система простая, это круто 👍

<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSCiE_k2MuvKhQjmaQct9uPyqhVbzNMEN1-WA&s" alt="drawing" width="100"/>

## `Что теперь?` 💅

Лаунчер стабилен, безопасен, имеет оконченный вид, есть минорные фиксы, всякие дополнения, но основа готова, теперь остаётся с удобством и лютым кайфом пилить новые сезоны для КШ и так далее, короче ваще имбища, но всё-таки роадмапу здесь оставлю **xDDD**

- [ ] Индкесы не работают с первого раза
