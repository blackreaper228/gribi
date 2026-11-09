# Вещи

Галерея с деревянными полками и девятью демонстрационными фотографиями с Unsplash. Тексты историй вымышленные. Изображения загружаются с images.unsplash.com.

## Запуск
Откройте index.html или запустите python -m http.server 5173.

## Полки
В index.html настройка cabinetSettings.minimumShelves задаёт минимальное число полок (сейчас 6). Увеличьте её, чтобы добавить пустые полки. cabinetSettings.objectsPerShelf задаёт число предметов на полке (сейчас 3). При переполнении полки добавляются автоматически. Страница прокручивается вниз обычным способом.

## Предметы
Добавьте запись в массив data: title, meta, description, photo (URL фотографии без параметров), shape (portrait или landscape). renderCabinet() строит шкаф по этим данным. photoMarkup() задаёт размер фотографий на полках и в модальном окне.

## Управление
Клик открывает историю, стрелки листают предметы, Escape и клик по фону закрывают окно. Поддерживаются клавиатура и reduced motion.

## Фото
Демонстрационные фотографии: https://unsplash.com/photos/6TZ1Xp3ZNA4, https://unsplash.com/photos/4cNNenEn54c, https://unsplash.com/photos/2HFe1VFPlyQ, https://unsplash.com/photos/lyfkxrm982M, https://unsplash.com/photos/tXzfkxQwqpg, https://unsplash.com/photos/Mu3AITJoswM, https://unsplash.com/photos/fT-A02h_Qus, https://unsplash.com/photos/OVgsZlIWhkU, https://unsplash.com/photos/DUgf336dgi4.
Лицензия: https://unsplash.com/license.

## Публикация
GitHub Pages: https://blackreaper228.github.io/gribi/
