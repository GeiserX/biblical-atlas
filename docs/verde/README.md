# Propuestas en verde

Quien prueba el sitio en familia preguntó por qué la rama de olivo es roja y amarilla, porque le recordaba a la bandera belga o a la alemana, y pidió un sitio en tonos verdes. Aquí hay propuestas en verde para la marca, para el banner del README y para la página entera. Nada está decidido: se elige una marca, un banner y una paleta, o ninguna.

Todo lo de esta carpeta es una propuesta. No cambia nada en [`site/`](../../site) ni en [`docs/images/`](../images).

## La marca en seis verdes

Las seis son la [rama de olivo](../logo/README.md#6-rama-de-olivo) que ya usa el sitio, con la misma forma: cuatro hojas, un tallo que es una ruta y tres aceitunas que son sus paradas. Solo cambian los colores. Cada propuesta tiene los mismos tres archivos que la ronda del logo:

- `marca.svg`: la marca sola, en 64 × 64.
- `horizontal.svg`: la marca con el nombre en EB Garamond, convertido en trazos.
- `monocromo.svg`: marca y nombre a una sola tinta verde, con huecos transparentes entre hojas, tallo y aceitunas.

`vista.png` enseña la marca en la cabecera clara, en una cabecera oscura, en la pestaña del navegador y a 16, 28 y 64 px. Sobre fondo oscuro el tallo pasa a claro, igual que hoy en el banner del README, en las propuestas 1 a 4 se aclaran además las aceitunas o las hojas que se perderían, y la 6 pasa entera a un verde claro.

![Las seis marcas en verde a 16, 28 y 64 px, sobre pergamino, sobre blanco y sobre una cabecera oscura, con la marca actual arriba](logo/comparativa.png)

La primera fila es la marca actual, para comparar. La columna de 16 px es la que se ve en la pestaña.

### Contraste de cada parte

Es el contraste de cada color con el fondo, según la fórmula de WCAG. Para un dibujo que no es texto, WCAG pide 3:1; hoy las hojas doradas se quedan en 2,8:1 sobre el pergamino, así que ese es el mínimo que nos pusimos. El pergamino es `#f6f1e7` y la cabecera oscura, `#1c2b22`.

| Marca | Hojas | Tallo | Aceitunas | Hojas, en oscuro | Tallo claro, en oscuro | Aceitunas, en oscuro |
|---|---|---|---|---|---|---|
| Actual | 2,8 | 15,3 | 5,5 | 4,7 | 12,1 | 3,9 |
| 1. Hoja de olivo y aceituna negra | 4,3 | 12,7 | 11,8 | 3,1 | 12,1 | 3,8 |
| 2. Salvia | 3,0 | 8,8 | 5,1 | 4,4 | 12,1 | 7,4 |
| 3. Bosque | 6,6 | 14,2 | 2,9 | 5,7 | 12,1 | 4,5 |
| 4. Verde azulado | 4,4 | 13,3 | 9,5 | 3,0 | 12,1 | 7,4 |
| 5. Hojas verdes, aceitunas de oro | 4,1 | 15,3 | 3,1 | 3,2 | 12,1 | 4,3 |
| 6. Verde a una tinta | 6,7 | 6,7 | 6,7 | 7,9 | 7,9 | 7,9 |

### 1. Hoja de olivo y aceituna negra

Hojas verde oliva `#667a2a` y aceitunas de un negro morado `#3a2a3e`, como las aceitunas maduras, sobre un tallo de madera oscura. Es la más fiel a un olivo de verdad; en fondo oscuro las aceitunas pasan a un malva claro para no desaparecer.

![Vista de la propuesta 1](logo/1-oliva/vista.png)

### 2. Salvia

Todo en verdes grisáceos: hojas salvia `#76937b`, aceitunas `#4e6d57` y tallo `#34473b`. Es la más suave y la que menos pesa en la cabecera, y por eso sus hojas son las más justas de contraste, 3,0:1.

![Vista de la propuesta 2](logo/2-salvia/vista.png)

### 3. Bosque

Hojas verde bosque `#2f5f3e` y aceitunas verdes claras `#6e9a3c`, como aceitunas sin madurar. Es la más verde de las seis y la que mejor se ve a 16 px; en oscuro las hojas se aclaran a `#6fae7c`.

![Vista de la propuesta 3](logo/3-bosque/vista.png)

### 4. Verde azulado

Hojas `#2e7c6c`, entre verde y azul, con aceitunas `#174541` casi negras en el mismo tono. Es la más fresca y la única que tira hacia el mar del mapa.

![Vista de la propuesta 4](logo/4-verde-azulado/vista.png)

### 5. Hojas verdes, aceitunas de oro

Hojas verde hoja `#4f8138`, aceitunas de oro `#a9851f` y el tallo en la tinta de hoy. Quita el rojo pero guarda un toque cálido, así que es la que menos se aleja de la marca actual.

![Vista de la propuesta 5](logo/5-hojas-y-oro/vista.png)

### 6. Verde a una tinta

Una sola tinta, `#2f5d46`, con un hueco fino que separa las hojas del tallo y de las aceitunas, igual que la versión monocroma de la marca actual. Es la más sobria y la que mejor se imprime o se borda, porque no depende de combinar colores.

![Vista de la propuesta 6](logo/6-verde-a-una-tinta/vista.png)

## El banner con las tres mejores marcas

Elegimos la 1, la 3 y la 4 porque son las tres familias de verde más distintas entre sí: oliva, bosque y verde azulado. Los tres banners tienen la composición y el tamaño del [banner actual](../images/banner.svg), 900 × 200, con la marca a la izquierda, el nombre en el centro y el lema «La Biblia en el mapa y en el tiempo». El nombre va en EB Garamond, la letra de la cabecera, y el lema en Inter, los dos convertidos en trazos para que GitHub los enseñe igual en cualquier equipo. `vista.png` es el banner al doble de resolución.

![El banner actual y los tres banners en verde, uno debajo de otro](banner/comparativa.png)

El contraste más bajo de cada parte, medido contra los dos extremos del degradado:

| Banner | Hojas | Tallo | Aceitunas | Nombre | Lema |
|---|---|---|---|---|---|
| 1. Olivar, claro | 3,9 | 11,7 | 10,8 | 13,1 | 5,4 |
| 3. Bosque | 3,8 | 8,2 | 5,1 | 8,2 | 5,9 |
| 4. Verde azulado | 3,0 | 6,5 | 5,9 | 6,5 | 5,0 |

### 1. Olivar, claro

El único banner claro: pergamino que se va aclarando hacia un verde oliva muy pálido, con la marca 1 tal cual y un borde fino para que no se funda con el blanco de GitHub. Es el que más se parece al propio sitio.

![Banner 1](banner/1-olivar-claro/vista.png)

### 3. Bosque

Degradado de verde bosque a casi negro, con la marca 3 en su forma para fondo oscuro: tallo claro, hojas `#6fae7c` y aceitunas verdes algo más claras que en la marca. Es el más verde de los tres y el que mejor funciona en el modo oscuro de GitHub.

![Banner 3](banner/3-bosque/vista.png)

### 4. Verde azulado

Degradado de verde azulado a verde muy oscuro, con hojas `#5fae9b` y aceitunas verde agua. Es el más fresco y el más cercano al color del mar en el mapa.

![Banner 4](banner/4-verde-azulado/vista.png)
