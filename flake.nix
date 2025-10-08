{
  description =
    "MorphEdit - Cross-platform audio editor for samplers and hardware instruments";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Node.js version
        nodejs = pkgs.nodejs_24;

        # Bun package
        bun = pkgs.bun;

        # Build inputs for the development environment
        buildInputs = with pkgs; [
          nodejs
          bun
          python3
          typescript

          # Development tools
          git
          curl
        ];

      in {
        devShells.default = pkgs.mkShell {
          buildInputs = buildInputs;

          shellHook = ''
            echo "🎵 MorphEdit Development Environment"
            echo "Node.js: $(node --version)"
            echo "Bun: $(bun --version)"

            # Ensure bun is in PATH
            export PATH="$PATH:${bun}/bin"

            # Python path for node-gyp
            export PYTHON="${pkgs.python3}/bin/python"

            echo ""
            echo "Available commands:"
            echo "  bun install          - Install dependencies"
            echo "  bun dev              - Start development server"
            echo "  bun run build        - Build for production"
            echo "  bun run electron:dev - Run Electron in development"
            echo "  bun run test         - Run vitest tests"
            echo "  bun run test:e2e     - Run E2E tests"
            echo ""
          '';

          # Environment variables
          env = {
            # Set Python for node-gyp
            PYTHON = "${pkgs.python3}/bin/python";

            # Fix for some native modules
            npm_config_build_from_source = "true";

            # Node.js optimization for Vite (4GB heap)
            NODE_OPTIONS = "--max-old-space-size=4096";
          };
        };

        # Optional: provide packages for use in other flakes
        packages = {
          nodejs = nodejs;
          bun = bun;
        };

        # Optional: provide the development environment as an app
        apps.default = {
          type = "app";
          program = "${pkgs.writeShellScript "morphedit-dev" ''
            echo "Starting MorphEdit development environment..."
            ${bun}/bin/bun dev
          ''}";
        };
      });
}
