# HexaPath: A Modern Hex Game

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Valentinbist/generated-app-20251021-081645)

HexaPath is a digital implementation of the classic abstract strategy board game, Hex, played on an 11x11 hexagonal grid. The game features a vibrant, playful, and modern user interface designed for a delightful user experience. Two players, Blue and Red, take turns placing their colored tiles on empty hexagons. The objective for the Blue player is to create an unbroken path of their tiles connecting the top and bottom edges of the board. The objective for the Red player is to connect the left and right edges.

The application is a single-page, client-side rendered game with all logic handled in the browser. It features smooth animations for tile placement, clear visual feedback for game state, and a celebratory animation upon a player's victory.

## Key Features

-   **Classic 11x11 Hex Gameplay**: The timeless strategy game on a standard-sized board.
-   **Two-Player Local Game**: Blue player aims to connect top-to-bottom, Red player aims to connect left-to-right.
-   **Modern & Playful UI**: A visually stunning interface with a bright, high-contrast color palette and smooth animations.
-   **Interactive Board**: Hexagons provide hover feedback and satisfying "pop" animations on tile placement.
-   **Clear State Indication**: Easily see whose turn it is and who the winner is.
-   **Win Celebration**: The winning path is highlighted with a pulsing glow, followed by a confetti explosion.
-   **Responsive Design**: Flawless gameplay experience across all device sizes.

## Technology Stack

-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **UI Components**: shadcn/ui
-   **State Management**: Zustand
-   **Animation**: Framer Motion
-   **Deployment**: Cloudflare Pages & Workers

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) package manager

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/hexapath.git
    cd hexapath
    ```

2.  **Install dependencies:**
    This project uses `bun` for package management.
    ```sh
    bun install
    ```

### Running the Development Server

To start the local development server, run the following command:

```sh
bun run dev
```

The application will be available at `http://localhost:3000` (or another port if 3000 is in use).

## Available Scripts

-   `bun run dev`: Starts the Vite development server.
-   `bun run build`: Builds the application for production.
-   `bun run lint`: Lints the codebase using ESLint.
-   `bun run preview`: Serves the production build locally for previewing.
-   `bun run deploy`: Deploys the application to Cloudflare.

## Deployment

This project is configured for seamless deployment to the Cloudflare network.

### Deploy via Wrangler CLI

Ensure you have [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed and configured. Then, run the deployment script:

```sh
bun run deploy
```

This command will build the project and deploy it using the configuration in `wrangler.toml`.

### Deploy with the Deploy Button

Alternatively, you can deploy this project to Cloudflare with a single click.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Valentinbist/generated-app-20251021-081645)

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.