import { PuzzleDefinition } from './gameTypes';

/**
 * Pre-baked, programmatically verified unique-solution campaign levels (1..24).
 * Instant 0ms load with zero runtime solver overhead.
 */
export const BAKED_LEVELS: readonly PuzzleDefinition[] = [
  {
    "id": 1,
    "title": "Morning Stretch",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        3,
        0,
        0,
        0,
        1,
        1
      ],
      [
        3,
        3,
        0,
        0,
        2,
        1
      ],
      [
        3,
        3,
        3,
        2,
        2,
        1
      ],
      [
        3,
        3,
        3,
        2,
        2,
        1
      ],
      [
        3,
        3,
        4,
        4,
        2,
        2
      ],
      [
        4,
        4,
        4,
        5,
        5,
        2
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 1
      },
      {
        "row": 1,
        "col": 5
      },
      {
        "row": 2,
        "col": 3
      },
      {
        "row": 3,
        "col": 0
      },
      {
        "row": 4,
        "col": 2
      },
      {
        "row": 5,
        "col": 4
      }
    ],
    "initialCats": [
      {
        "row": 3,
        "col": 0
      },
      {
        "row": 1,
        "col": 5
      }
    ],
    "parTimeSec": 55
  },
  {
    "id": 2,
    "title": "Sunbeam Nap",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        0,
        0,
        2,
        2,
        2,
        2
      ],
      [
        0,
        3,
        2,
        2,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        4,
        4
      ],
      [
        5,
        3,
        3,
        3,
        4,
        4
      ],
      [
        5,
        3,
        5,
        3,
        4,
        4
      ],
      [
        5,
        5,
        5,
        4,
        4,
        4
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 5
      },
      {
        "row": 2,
        "col": 3
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 4
      },
      {
        "row": 5,
        "col": 2
      }
    ],
    "initialCats": [
      {
        "row": 5,
        "col": 2
      }
    ],
    "parTimeSec": 55
  },
  {
    "id": 3,
    "title": "Milk Bowl",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        0,
        2,
        1,
        1,
        1,
        3
      ],
      [
        2,
        2,
        2,
        2,
        1,
        3
      ],
      [
        2,
        2,
        2,
        2,
        1,
        3
      ],
      [
        4,
        2,
        3,
        3,
        3,
        3
      ],
      [
        4,
        4,
        4,
        4,
        5,
        3
      ],
      [
        4,
        4,
        5,
        5,
        5,
        3
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 4
      },
      {
        "row": 2,
        "col": 2
      },
      {
        "row": 3,
        "col": 5
      },
      {
        "row": 4,
        "col": 1
      },
      {
        "row": 5,
        "col": 3
      }
    ],
    "initialCats": [
      {
        "row": 4,
        "col": 1
      }
    ],
    "parTimeSec": 55
  },
  {
    "id": 4,
    "title": "Yarn Tangle",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        0,
        0,
        0,
        3,
        3,
        3
      ],
      [
        0,
        3,
        3,
        3,
        1,
        1
      ],
      [
        0,
        2,
        2,
        3,
        3,
        1
      ],
      [
        2,
        2,
        2,
        3,
        2,
        1
      ],
      [
        2,
        5,
        2,
        2,
        2,
        4
      ],
      [
        2,
        5,
        5,
        5,
        5,
        4
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 4
      },
      {
        "row": 2,
        "col": 1
      },
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 2
      }
    ],
    "initialCats": [],
    "parTimeSec": 55
  },
  {
    "id": 5,
    "title": "Window Sill",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        0,
        0,
        1,
        1,
        1,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2,
        1
      ],
      [
        2,
        2,
        2,
        2,
        3,
        3
      ],
      [
        2,
        3,
        3,
        3,
        3,
        3
      ],
      [
        3,
        3,
        5,
        5,
        4,
        3
      ],
      [
        5,
        5,
        5,
        5,
        4,
        4
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 5
      },
      {
        "row": 2,
        "col": 3
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 4
      },
      {
        "row": 5,
        "col": 2
      }
    ],
    "initialCats": [],
    "parTimeSec": 55
  },
  {
    "id": 6,
    "title": "Paw Prints",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        0,
        2,
        3,
        3,
        3,
        3
      ],
      [
        0,
        2,
        2,
        1,
        3,
        3
      ],
      [
        2,
        2,
        2,
        1,
        3,
        3
      ],
      [
        2,
        4,
        3,
        3,
        3,
        5
      ],
      [
        4,
        4,
        4,
        4,
        5,
        5
      ],
      [
        4,
        4,
        4,
        5,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 3
      },
      {
        "row": 2,
        "col": 1
      },
      {
        "row": 3,
        "col": 4
      },
      {
        "row": 4,
        "col": 2
      },
      {
        "row": 5,
        "col": 5
      }
    ],
    "initialCats": [],
    "parTimeSec": 55
  },
  {
    "id": 7,
    "title": "Cozy Cushion",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        2,
        2,
        1,
        1,
        3,
        0
      ],
      [
        2,
        2,
        1,
        1,
        3,
        3
      ],
      [
        2,
        3,
        3,
        3,
        3,
        3
      ],
      [
        4,
        4,
        4,
        3,
        5,
        3
      ],
      [
        4,
        4,
        4,
        5,
        5,
        3
      ],
      [
        4,
        4,
        5,
        5,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 5
      },
      {
        "row": 1,
        "col": 2
      },
      {
        "row": 2,
        "col": 0
      },
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 1
      },
      {
        "row": 5,
        "col": 4
      }
    ],
    "initialCats": [],
    "parTimeSec": 55
  },
  {
    "id": 8,
    "title": "Catnip Garden",
    "difficulty": "easy",
    "size": 6,
    "regions": [
      [
        2,
        2,
        2,
        2,
        0,
        0
      ],
      [
        1,
        3,
        2,
        0,
        0,
        4
      ],
      [
        1,
        3,
        2,
        2,
        2,
        4
      ],
      [
        3,
        3,
        5,
        4,
        4,
        4
      ],
      [
        3,
        5,
        5,
        5,
        5,
        4
      ],
      [
        3,
        5,
        5,
        5,
        4,
        4
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 4
      },
      {
        "row": 1,
        "col": 0
      },
      {
        "row": 2,
        "col": 3
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 2
      }
    ],
    "initialCats": [],
    "parTimeSec": 55
  },
  {
    "id": 9,
    "title": "Whisker Maze",
    "difficulty": "medium",
    "size": 6,
    "regions": [
      [
        1,
        0,
        0,
        0,
        2,
        2
      ],
      [
        1,
        1,
        4,
        3,
        2,
        2
      ],
      [
        4,
        4,
        4,
        3,
        3,
        2
      ],
      [
        4,
        4,
        4,
        3,
        3,
        3
      ],
      [
        4,
        4,
        4,
        3,
        5,
        5
      ],
      [
        4,
        4,
        4,
        5,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 2
      },
      {
        "row": 1,
        "col": 0
      },
      {
        "row": 2,
        "col": 5
      },
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 1
      },
      {
        "row": 5,
        "col": 4
      }
    ],
    "initialCats": [],
    "parTimeSec": 80
  },
  {
    "id": 10,
    "title": "Rooftop Leap",
    "difficulty": "medium",
    "size": 6,
    "regions": [
      [
        0,
        2,
        2,
        2,
        2,
        4
      ],
      [
        0,
        2,
        2,
        1,
        1,
        4
      ],
      [
        2,
        2,
        3,
        1,
        4,
        4
      ],
      [
        2,
        5,
        3,
        3,
        4,
        4
      ],
      [
        5,
        5,
        5,
        3,
        3,
        4
      ],
      [
        5,
        5,
        5,
        3,
        4,
        4
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 4
      },
      {
        "row": 2,
        "col": 1
      },
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 2
      }
    ],
    "initialCats": [],
    "parTimeSec": 80
  },
  {
    "id": 11,
    "title": "Feather Chase",
    "difficulty": "medium",
    "size": 6,
    "regions": [
      [
        2,
        2,
        2,
        2,
        2,
        0
      ],
      [
        2,
        2,
        1,
        3,
        0,
        0
      ],
      [
        2,
        4,
        1,
        3,
        3,
        5
      ],
      [
        2,
        4,
        4,
        3,
        3,
        5
      ],
      [
        2,
        4,
        4,
        4,
        4,
        5
      ],
      [
        4,
        4,
        4,
        4,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 5
      },
      {
        "row": 1,
        "col": 2
      },
      {
        "row": 2,
        "col": 0
      },
      {
        "row": 3,
        "col": 3
      },
      {
        "row": 4,
        "col": 1
      },
      {
        "row": 5,
        "col": 4
      }
    ],
    "initialCats": [],
    "parTimeSec": 80
  },
  {
    "id": 12,
    "title": "Pantry Sneak",
    "difficulty": "medium",
    "size": 6,
    "regions": [
      [
        4,
        2,
        0,
        1,
        1,
        3
      ],
      [
        4,
        2,
        0,
        0,
        1,
        3
      ],
      [
        4,
        2,
        2,
        3,
        3,
        3
      ],
      [
        4,
        4,
        3,
        3,
        5,
        3
      ],
      [
        4,
        4,
        4,
        3,
        5,
        3
      ],
      [
        4,
        4,
        5,
        5,
        5,
        3
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 2
      },
      {
        "row": 1,
        "col": 4
      },
      {
        "row": 2,
        "col": 1
      },
      {
        "row": 3,
        "col": 5
      },
      {
        "row": 4,
        "col": 0
      },
      {
        "row": 5,
        "col": 3
      }
    ],
    "initialCats": [],
    "parTimeSec": 80
  },
  {
    "id": 13,
    "title": "Big Kitty Park",
    "difficulty": "medium",
    "size": 8,
    "regions": [
      [
        2,
        2,
        1,
        1,
        4,
        4,
        0,
        0
      ],
      [
        2,
        2,
        1,
        3,
        3,
        4,
        4,
        4
      ],
      [
        2,
        2,
        2,
        3,
        3,
        4,
        4,
        4
      ],
      [
        3,
        3,
        3,
        3,
        3,
        3,
        4,
        4
      ],
      [
        5,
        5,
        3,
        3,
        6,
        6,
        4,
        6
      ],
      [
        5,
        5,
        5,
        6,
        6,
        6,
        6,
        6
      ],
      [
        5,
        7,
        5,
        6,
        6,
        6,
        6,
        6
      ],
      [
        5,
        7,
        7,
        7,
        6,
        6,
        6,
        6
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 7
      },
      {
        "row": 1,
        "col": 2
      },
      {
        "row": 2,
        "col": 0
      },
      {
        "row": 3,
        "col": 4
      },
      {
        "row": 4,
        "col": 6
      },
      {
        "row": 5,
        "col": 1
      },
      {
        "row": 6,
        "col": 5
      },
      {
        "row": 7,
        "col": 3
      }
    ],
    "initialCats": [],
    "parTimeSec": 125
  },
  {
    "id": 14,
    "title": "Velvet Paws",
    "difficulty": "medium",
    "size": 8,
    "regions": [
      [
        1,
        1,
        1,
        2,
        2,
        2,
        0,
        4
      ],
      [
        1,
        5,
        5,
        2,
        2,
        2,
        2,
        4
      ],
      [
        5,
        5,
        2,
        2,
        2,
        2,
        4,
        4
      ],
      [
        5,
        5,
        3,
        3,
        2,
        2,
        2,
        4
      ],
      [
        5,
        5,
        5,
        3,
        3,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        4,
        4,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        6,
        6,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        6,
        6,
        4,
        4,
        7
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 6
      },
      {
        "row": 1,
        "col": 0
      },
      {
        "row": 2,
        "col": 4
      },
      {
        "row": 3,
        "col": 2
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 1
      },
      {
        "row": 6,
        "col": 3
      },
      {
        "row": 7,
        "col": 7
      }
    ],
    "initialCats": [
      {
        "row": 7,
        "col": 7
      }
    ],
    "parTimeSec": 125
  },
  {
    "id": 15,
    "title": "Tuna Trails",
    "difficulty": "medium",
    "size": 8,
    "regions": [
      [
        0,
        0,
        0,
        1,
        1,
        1,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        2,
        2,
        1,
        1
      ],
      [
        3,
        3,
        6,
        6,
        6,
        2,
        2,
        2
      ],
      [
        6,
        3,
        3,
        6,
        4,
        4,
        2,
        2
      ],
      [
        6,
        6,
        6,
        6,
        4,
        4,
        2,
        2
      ],
      [
        6,
        5,
        6,
        6,
        4,
        4,
        4,
        4
      ],
      [
        5,
        5,
        6,
        6,
        4,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        6,
        6,
        4,
        7,
        7
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 7
      },
      {
        "row": 2,
        "col": 5
      },
      {
        "row": 3,
        "col": 2
      },
      {
        "row": 4,
        "col": 4
      },
      {
        "row": 5,
        "col": 1
      },
      {
        "row": 6,
        "col": 3
      },
      {
        "row": 7,
        "col": 6
      }
    ],
    "initialCats": [],
    "parTimeSec": 125
  },
  {
    "id": 16,
    "title": "Moonlit Porch",
    "difficulty": "medium",
    "size": 8,
    "regions": [
      [
        3,
        3,
        0,
        1,
        1,
        1,
        1,
        1
      ],
      [
        3,
        3,
        3,
        2,
        1,
        2,
        2,
        1
      ],
      [
        5,
        5,
        3,
        2,
        2,
        2,
        1,
        1
      ],
      [
        5,
        3,
        3,
        2,
        2,
        2,
        2,
        4
      ],
      [
        5,
        5,
        3,
        5,
        2,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        4,
        4
      ],
      [
        5,
        5,
        5,
        5,
        5,
        5,
        6,
        6
      ],
      [
        5,
        5,
        7,
        7,
        6,
        6,
        6,
        6
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 2
      },
      {
        "row": 1,
        "col": 7
      },
      {
        "row": 2,
        "col": 4
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 0
      },
      {
        "row": 6,
        "col": 6
      },
      {
        "row": 7,
        "col": 3
      }
    ],
    "initialCats": [],
    "parTimeSec": 125
  },
  {
    "id": 17,
    "title": "Shadow Prowl",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        0,
        0,
        0,
        0,
        0,
        1,
        1,
        1
      ],
      [
        4,
        3,
        3,
        3,
        3,
        1,
        1,
        1
      ],
      [
        4,
        3,
        4,
        3,
        3,
        3,
        2,
        2
      ],
      [
        4,
        4,
        4,
        4,
        3,
        3,
        5,
        2
      ],
      [
        4,
        6,
        6,
        6,
        6,
        5,
        5,
        5
      ],
      [
        7,
        6,
        6,
        6,
        6,
        6,
        5,
        6
      ],
      [
        7,
        7,
        7,
        6,
        7,
        6,
        6,
        6
      ],
      [
        7,
        7,
        7,
        7,
        7,
        6,
        6,
        6
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 2
      },
      {
        "row": 1,
        "col": 5
      },
      {
        "row": 2,
        "col": 7
      },
      {
        "row": 3,
        "col": 4
      },
      {
        "row": 4,
        "col": 0
      },
      {
        "row": 5,
        "col": 6
      },
      {
        "row": 6,
        "col": 3
      },
      {
        "row": 7,
        "col": 1
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 18,
    "title": "Clever Calico",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        2,
        0,
        2,
        2,
        2,
        2,
        3,
        3
      ],
      [
        2,
        0,
        2,
        2,
        2,
        2,
        3,
        1
      ],
      [
        2,
        2,
        2,
        2,
        2,
        3,
        3,
        1
      ],
      [
        5,
        5,
        5,
        2,
        4,
        4,
        3,
        3
      ],
      [
        5,
        5,
        5,
        4,
        4,
        4,
        7,
        7
      ],
      [
        6,
        5,
        5,
        5,
        6,
        4,
        7,
        7
      ],
      [
        6,
        6,
        6,
        6,
        6,
        4,
        4,
        7
      ],
      [
        6,
        6,
        6,
        6,
        6,
        7,
        7,
        7
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 1
      },
      {
        "row": 1,
        "col": 7
      },
      {
        "row": 2,
        "col": 3
      },
      {
        "row": 3,
        "col": 6
      },
      {
        "row": 4,
        "col": 4
      },
      {
        "row": 5,
        "col": 2
      },
      {
        "row": 6,
        "col": 0
      },
      {
        "row": 7,
        "col": 5
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 19,
    "title": "Ginger Riddle",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        3,
        3,
        2,
        2,
        2,
        0,
        1,
        1
      ],
      [
        3,
        4,
        2,
        2,
        2,
        0,
        5,
        1
      ],
      [
        3,
        4,
        4,
        4,
        2,
        5,
        5,
        5
      ],
      [
        3,
        4,
        4,
        4,
        4,
        5,
        5,
        5
      ],
      [
        6,
        4,
        4,
        4,
        7,
        5,
        5,
        5
      ],
      [
        6,
        4,
        7,
        4,
        7,
        5,
        5,
        5
      ],
      [
        6,
        6,
        7,
        7,
        7,
        5,
        5,
        5
      ],
      [
        6,
        7,
        7,
        7,
        7,
        7,
        7,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 5
      },
      {
        "row": 1,
        "col": 7
      },
      {
        "row": 2,
        "col": 4
      },
      {
        "row": 3,
        "col": 0
      },
      {
        "row": 4,
        "col": 2
      },
      {
        "row": 5,
        "col": 6
      },
      {
        "row": 6,
        "col": 1
      },
      {
        "row": 7,
        "col": 3
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 20,
    "title": "Tuxedo Logic",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        2,
        2,
        2,
        2,
        1,
        3,
        3,
        0
      ],
      [
        2,
        2,
        2,
        1,
        1,
        3,
        3,
        0
      ],
      [
        2,
        4,
        4,
        1,
        3,
        3,
        3,
        3
      ],
      [
        6,
        4,
        4,
        3,
        3,
        5,
        3,
        5
      ],
      [
        6,
        6,
        4,
        4,
        4,
        5,
        5,
        5
      ],
      [
        6,
        6,
        4,
        7,
        7,
        7,
        5,
        5
      ],
      [
        6,
        6,
        6,
        7,
        7,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        7,
        7,
        7,
        7,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 7
      },
      {
        "row": 1,
        "col": 3
      },
      {
        "row": 2,
        "col": 0
      },
      {
        "row": 3,
        "col": 4
      },
      {
        "row": 4,
        "col": 2
      },
      {
        "row": 5,
        "col": 6
      },
      {
        "row": 6,
        "col": 1
      },
      {
        "row": 7,
        "col": 5
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 21,
    "title": "Alleyway Puzzle",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        0,
        0,
        0,
        0,
        1,
        1,
        1,
        1
      ],
      [
        0,
        0,
        0,
        2,
        1,
        2,
        2,
        1
      ],
      [
        3,
        2,
        2,
        2,
        2,
        2,
        2,
        5
      ],
      [
        3,
        4,
        2,
        2,
        2,
        5,
        5,
        5
      ],
      [
        6,
        4,
        4,
        2,
        2,
        2,
        2,
        5
      ],
      [
        6,
        4,
        4,
        4,
        4,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        5,
        5,
        5
      ],
      [
        6,
        7,
        7,
        6,
        6,
        6,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 3
      },
      {
        "row": 1,
        "col": 7
      },
      {
        "row": 2,
        "col": 5
      },
      {
        "row": 3,
        "col": 0
      },
      {
        "row": 4,
        "col": 2
      },
      {
        "row": 5,
        "col": 6
      },
      {
        "row": 6,
        "col": 4
      },
      {
        "row": 7,
        "col": 1
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 22,
    "title": "Starlight Purr",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        1,
        1,
        1,
        1,
        0,
        0,
        0,
        0
      ],
      [
        3,
        3,
        1,
        1,
        1,
        0,
        0,
        0
      ],
      [
        3,
        3,
        3,
        0,
        0,
        0,
        0,
        2
      ],
      [
        3,
        3,
        3,
        3,
        0,
        2,
        2,
        2
      ],
      [
        3,
        3,
        3,
        4,
        4,
        2,
        5,
        5
      ],
      [
        4,
        4,
        4,
        4,
        4,
        5,
        5,
        5
      ],
      [
        6,
        4,
        4,
        5,
        5,
        5,
        5,
        5
      ],
      [
        6,
        6,
        6,
        6,
        6,
        6,
        7,
        7
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 4
      },
      {
        "row": 1,
        "col": 2
      },
      {
        "row": 2,
        "col": 7
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 3
      },
      {
        "row": 5,
        "col": 5
      },
      {
        "row": 6,
        "col": 0
      },
      {
        "row": 7,
        "col": 6
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  },
  {
    "id": 23,
    "title": "Nine Lives",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        0,
        0,
        0,
        4,
        4,
        4,
        4,
        4
      ],
      [
        0,
        3,
        3,
        1,
        4,
        4,
        4,
        4
      ],
      [
        3,
        3,
        3,
        1,
        1,
        1,
        4,
        2
      ],
      [
        5,
        3,
        5,
        5,
        5,
        4,
        4,
        4
      ],
      [
        5,
        5,
        5,
        5,
        5,
        4,
        6,
        4
      ],
      [
        5,
        5,
        5,
        5,
        7,
        4,
        6,
        6
      ],
      [
        5,
        5,
        5,
        7,
        7,
        4,
        6,
        6
      ],
      [
        5,
        5,
        5,
        5,
        7,
        7,
        7,
        6
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 3
      },
      {
        "row": 2,
        "col": 7
      },
      {
        "row": 3,
        "col": 1
      },
      {
        "row": 4,
        "col": 5
      },
      {
        "row": 5,
        "col": 2
      },
      {
        "row": 6,
        "col": 6
      },
      {
        "row": 7,
        "col": 4
      }
    ],
    "initialCats": [
      {
        "row": 2,
        "col": 7
      }
    ],
    "parTimeSec": 165
  },
  {
    "id": 24,
    "title": "Grand Meowster",
    "difficulty": "hard",
    "size": 8,
    "regions": [
      [
        0,
        0,
        1,
        1,
        1,
        3,
        3,
        3
      ],
      [
        4,
        1,
        1,
        2,
        1,
        3,
        3,
        3
      ],
      [
        4,
        4,
        4,
        2,
        2,
        2,
        2,
        3
      ],
      [
        4,
        2,
        2,
        2,
        2,
        2,
        3,
        3
      ],
      [
        4,
        4,
        7,
        7,
        6,
        2,
        2,
        2
      ],
      [
        4,
        7,
        7,
        6,
        6,
        2,
        2,
        5
      ],
      [
        4,
        4,
        7,
        7,
        6,
        6,
        6,
        5
      ],
      [
        4,
        7,
        7,
        7,
        7,
        5,
        5,
        5
      ]
    ],
    "solution": [
      {
        "row": 0,
        "col": 0
      },
      {
        "row": 1,
        "col": 2
      },
      {
        "row": 2,
        "col": 4
      },
      {
        "row": 3,
        "col": 6
      },
      {
        "row": 4,
        "col": 1
      },
      {
        "row": 5,
        "col": 7
      },
      {
        "row": 6,
        "col": 5
      },
      {
        "row": 7,
        "col": 3
      }
    ],
    "initialCats": [],
    "parTimeSec": 165
  }
] as const;
