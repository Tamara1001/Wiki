const users = [
    { username: 'Tamara', passwordHash: 'b1fae852f4bfff6f785f36cab725c5cc88d7b014f51589e134207decde8da02d', role: 'custom' },
    { username: 'Ale', passwordHash: 'ad8a6559dc524d09d1c89990a4d821fd19353a94b38a9c82e1a354c7fbd55c74', role: 'admin' }
];

const wikiData = {
    // Categories act as sections in the sidebar and content
    categories: [
        {
            id: 'stats',
            name: 'Core Statistics',
            section: 'core',
            items: [
                { id: 'str', name: 'Strength', description: 'Measures bodily power, athletic training, and the extent to which you can exert raw physical force.', tags: ['Attribute', 'Core'] },
                { id: 'dex', name: 'Dexterity', description: 'Measures agility, reflexes, and balance.', tags: ['Attribute', 'Core'] },
                { id: 'con', name: 'Constitution', description: 'Measures health, stamina, and vital force.', tags: ['Attribute', 'Core'] },
                { id: 'int', name: 'Intelligence', description: 'Measures mental acuity, accuracy of recall, and the ability to reason.', tags: ['Attribute', 'Core'] },
                { id: 'wis', name: 'Wisdom', description: 'Measures how attuned you are to the world around you and represents perceptiveness and intuition.', tags: ['Attribute', 'Core'] },
                { id: 'cha', name: 'Charisma', description: 'Measures your ability to interact effectively with others. It includes such factors as confidence and eloquence.', tags: ['Attribute', 'Core'] }
            ]
        },
        {
            id: 'classes',
            name: 'Classes',
            section: 'player',
            items: [
                { id: 'barbarian', name: 'Barbarian', description: 'A fierce warrior of primitive background who can enter a battle rage.', tags: ['Melee', 'Tank'] },
                { id: 'bard', name: 'Bard', description: 'An inspiring magician whose power echoes the music of creation.', tags: ['Support', 'Caster'] },
                { id: 'cleric', name: 'Cleric', description: 'A priestly champion who wields divine magic in service of a higher power.', tags: ['Healer', 'Caster'] },
                { id: 'druid', name: 'Druid', description: 'A priest of the Old Faith, wielding the powers of nature and moonlight.', tags: ['Caster', 'Shapeshifter'] },
                { id: 'fighter', name: 'Fighter', description: 'A master of martial combat, skilled with a variety of weapons and armor.', tags: ['Melee', 'Ranged'] },
                { id: 'paladin', name: 'Paladin', description: 'A holy warrior bound to a sacred oath.', tags: ['Melee', 'Support'] },
                { id: 'ranger', name: 'Ranger', description: 'A warrior who uses martial prowess and nature magic to combat threats on the edges of civilization.', tags: ['Ranged', 'Melee'] },
                { id: 'rogue', name: 'Rogue', description: 'A scoundrel who uses stealth and trickery to overcome obstacles and enemies.', tags: ['Melee', 'Stealth'] },
                { id: 'sorcerer', name: 'Sorcerer', description: 'A spellcaster who draws on inherent magic from a gift or bloodline.', tags: ['Caster', 'Damage'] },
                { id: 'warlock', name: 'Warlock', description: 'A wielder of magic that is derived from a bargain with an extraplanar entity.', tags: ['Caster', 'Damage'] },
                { id: 'wizard', name: 'Wizard', description: 'A scholarly magic-user capable of manipulating the structures of reality.', tags: ['Caster', 'Utility'] }
            ]
        },
        {
            id: 'races',
            name: 'Races',
            section: 'player',
            items: [
                { id: 'human', name: 'Human', description: 'Humans are the most adaptable and ambitious people among the common races.', tags: ['Common'] },
                { id: 'elf', name: 'Elf', description: 'Elves are a magical people of otherworldly grace, living in the world but not entirely part of it.', tags: ['Common', 'Fey'] },
                { id: 'dwarf', name: 'Dwarf', description: 'Bold and hardy, dwarves are known as skilled warriors, miners, and workers of stone and metal.', tags: ['Common', 'Underground'] }
            ]
        },
        {
            id: 'bestiary',
            name: 'Bestiary',
            section: 'world',
            items: [
                { id: 'goblin', name: 'Goblin', description: 'Small, black-hearted, selfish humanoids that lair in caves, abandoned mines, despoiled dungeons, and other dismal settings.', tags: ['Humanoid', 'CR 1/4'] },
                { id: 'dragon', name: 'Dragon', description: 'Large reptilian monsters of tremendous power and intelligence.', tags: ['Dragon', 'Epic'], restrictedTo: ['Tamara'] },
                { id: 'skeleton', name: 'Skeleton', description: 'The animated bones of a dead humanoid or creature.', tags: ['Undead', 'CR 1/4'] }
            ]
        },
        {
            id: 'items',
            name: 'Items & Equipment',
            section: 'world',
            items: [
                { id: 'longsword', name: 'Longsword', description: 'A versatile melee weapon.', tags: ['Weapon', 'Slashing'] },
                { id: 'healing-potion', name: 'Potion of Healing', description: 'A magical red fluid that restores hit points.', tags: ['Consumable', 'Magic'], restrictedTo: ['Tamara'] },
                { id: 'plate-armor', name: 'Plate Armor', description: 'Heavy armor consisting of shaped, interlocking metal plates.', tags: ['Armor', 'Heavy'], restrictedTo: [] } // Empty list = Admin only effectively if we check .length and not match
            ]
        }
    ]
};
