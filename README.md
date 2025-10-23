# HexaPath: A Modern Hex Game

A digital implementation of the classic abstract strategy board game Hex, built with React and deployed on Cloudflare. Play on an 11x11 hexagonal grid with vibrant animations and smooth gameplay.

Each player needs to connect their correspondingly colour side to win.

> This project is an experiment with 100% AI development.

## Key Features

-   **Classic 11x11 Hex Gameplay**: The timeless strategy game on a standard-sized board.
-   **Two-Player Local Game**: Blue player aims to connect top-to-bottom, Red player aims to connect left-to-right.
-   **Modern & Playful UI**: A visually stunning interface with a bright, high-contrast color palette and smooth animations.
-   **Interactive Board**: Hexagons provide hover feedback and satisfying "pop" animations on tile placement.
-   **Clear State Indication**: Easily see whose turn it is and who the winner is.
-   **Win Celebration**: The winning path is highlighted with a pulsing glow, followed by a confetti explosion.
-   **Responsive Design**: Flawless gameplay experience across all device sizes.
-   **Online Multiplayer**: Real-time gameplay via polling (cost-effective for Cloudflare's KV storage)

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
-   [Bun](https://bun.sh/) package manager (tip: use [asdf](https://asdf-vm.com/) for easy version management)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/valentinbist/hexapath.git
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

### Setup Instructions

1. **Install Wrangler**: Follow the [Wrangler installation guide](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

2. **Create a KV Namespace**:
   ```sh
   wrangler kv namespace create GAMES_KV
   ```
   Copy the namespace ID from the output

3. **Update Configuration**:
   - Open `wrangler.jsonc`
   - Replace `YOUR_KV_NAMESPACE_ID_HERE` with your KV namespace ID
   - Update the `name` field if desired (default: "hexapath")

### Deploy via Wrangler CLI

Once configured, deploy with:

```sh
bun run deploy
```

This command will build the project and deploy it using the configuration in `wrangler.jsonc`.

## Contributing

This is a fun side project! Contributions, issues, and feature requests are welcome.

Feel free to fork, experiment, and submit PRs.

## License

This project is licensed under the MIT License.
