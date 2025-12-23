const users = [
    {
        "username": "Tamara",
        "passwordHash": "b1fae852f4bfff6f785f36cab725c5cc88d7b014f51589e134207decde8da02d",
        "role": "custom"
    },
    {
        "username": "Ale",
        "passwordHash": "ad8a6559dc524d09d1c89990a4d821fd19353a94b38a9c82e1a354c7fbd55c74",
        "role": "admin"
    }
];

const wikiData = {
    "heroTitle": "Welcome to the Wiki",
    "heroSubtitle": "The ultimate resource for adventurers. Explore classes, items, monsters, and spells.",
    "categories": [
        {
            "id": "new-category-1766381647143",
            "name": "Testing",
            "section": "world",
            "items": [
                {
                    "id": "new-item-1766381694140",
                    "name": "Test de Informaciones Ocultas",
                    "description": "Esta informacion es visible para todos!!!",
                    "tags": [
                        "New"
                    ],
                    "hiddenInfos": [
                        {
                            "content": "Esto solo puede verlo Lunaria",
                            "restrictedTo": [
                                "Lunaria"
                            ]
                        },
                        {
                            "content": "Esto solo puede verlo Keiko",
                            "restrictedTo": [
                                "Keiko"
                            ]
                        },
                        {
                            "content": "Esto pueden verlo Lunaria y Keiko",
                            "restrictedTo": [
                                "Lunaria",
                                "Keiko"
                            ]
                        }
                    ]
                },
                {
                    "id": "new-item-1766381647143",
                    "name": "Lunaria",
                    "description": "Lunaria",
                    "tags": [],
                    "restrictedTo": [
                        "Lunaria"
                    ]
                },
                {
                    "id": "new-item-1766381692884",
                    "name": "Keiko",
                    "description": "Keiko",
                    "tags": [
                        "New"
                    ],
                    "restrictedTo": [
                        "Keiko"
                    ]
                },
                {
                    "id": "new-item-1766394880600",
                    "name": "Test de colores",
                    "description": "<font color=\"#f44336\">rojo </font><font color=\"#ff9800\">naranja </font><font color=\"#4caf50\">verde </font><font color=\"#2196f3\">azul </font><font color=\"#9c27b0\">violeta&nbsp;</font><div><font color=\"#ffffff\">sadas<br></font><b style=\"font-size: 17.6px;\">negrita</b><br style=\"font-size: 17.6px;\"><i style=\"font-size: 17.6px;\">italic</i><br style=\"font-size: 17.6px;\"><u style=\"font-size: 17.6px;\">subrayado</u><br style=\"font-size: 17.6px;\"><strike style=\"font-size: 17.6px;\">tachado</strike><font color=\"#ffffff\"></font></div>",
                    "tags": [
                        "New"
                    ]
                },
                {
                    "id": "new-item-1766469801515",
                    "name": "Sincronizacion",
                    "description": "Item without description",
                    "tags": [
                        "New"
                    ]
                },
                {
                    "id": "new-item-1766470179171",
                    "name": "2",
                    "description": "Item without description",
                    "tags": [
                        "New"
                    ]
                },
                {
                    "id": "new-item-1766470381859",
                    "name": "3",
                    "description": "Item without description",
                    "tags": [
                        "New"
                    ]
                },
                {
                    "id": "new-item-1766470995708",
                    "name": "4",
                    "description": "Item without description",
                    "tags": [
                        "New"
                    ]
                }
            ],
            "description": "Estadisticas de Rolleandou lalalaa"
        },
        {
            "id": "new-category-1766393777331",
            "name": "Estadísticas",
            "section": "world",
            "description": "Category without description",
            "items": [
                {
                    "id": "new-item-1766393777331",
                    "name": "Fisico",
                    "description": "No se, no soy Ale :P",
                    "tags": [],
                    "restrictedTo": null
                },
                {
                    "id": "new-item-1766468228609",
                    "name": "Aura",
                    "description": "Item without description",
                    "tags": [
                        "New"
                    ]
                }
            ]
        }
    ]
};
