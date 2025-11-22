# Devlog Entry - 11/12/2025

## Introducing the Team

1. **Tools Lead** - Al Wen
2. **Engine Lead** - Stanley Hung
3. **Design Lead** - Tristan Chen
4. **Design Assistant** - Lorenzo Uk
5. **Testing Lead** - Arvin Arbabi

## Tools and Materials

1. **Engine** - For creating 3D objects we will be using Three.js. For implementing physics we plan on using Ammo.js. We decided to choose these two libraries because they’re meant for JavaScript / TypeScript, which is a language that we all have some experience working with.
2. **Language** - For languages, we plan to write all of our code in TypeScript. We want to have a universal language for all areas in our game to make debugging easier and for other team members to understand what is happening in those parts of the game. We will also be using some HTML/CSS to format and display the game.
3. **Tools** - We plan on using Visual Studio Code for programming. For version control and project management, we will be using Github and branches. We also plan on creating our own 3D assets using Blender.
4. **Generative AI** - We plan on using chatGPT and microsoft copilot to write more readable code. We would use it to identify code smells and help make debugging easier. We will not be using these tools for creating ideas and plans for the project.

## Outlook

**What is your team hoping to accomplish that other teams might not attempt?**

- We hope to create our own assets for our game instead of just finding online assets to use.

**What do you anticipate being the hardest or riskiest part of the project?**

- We anticipate that the hardest part of the project is implementing the 3D objects and physics into the game as well as the initial setup. We don’t really have much experience using outside libraries for 3D projects aside from engines designed for 3D experiences (Unity, Godot). Furthermore, a lot of our experience so far in programming has been done with pre-built starter code which made it easier to get started with projects.

**What are you hoping to learn by approaching the project with the tools and materials you selected above?**

- We hope to learn how to create a physics engine from “scratch” and to use outside libraries in programming projects.

# Devlog Entry - 11/21/2025

## How we satisfied the software requirements

1. Our project is built with TypeScript. At its default, TypeScript does not come with support for 3D rendering and physics simulation. To do 3D rendering and physics simulation, we imported two libraries: three.js and ammo.js. 

2. Our project uses Three.js as our third-party 3D rendering library.  We did this by installing the Three library module into our code through Deno.  To actually use it in our code, we imported the module in main.ts.

3. Our project uses Ammo.js as our third-party physics simulation library.  We did this by installing the Ammo library into our code through Deno.  To actually use it in our code, we imported the module in main.ts.

4. Our playable prototype presents the player with a simple physics based puzzle. The goal of the puzzle is for the player to exert force on a ball to push it into a hole on the platform. The puzzle requires the player to push the ball in the hole within 3 tries.

5. The player can exert control over the simulation by holding the spacebar. The duration the player holds the spacebar correlates with the amount of force that will be applied to it. When the player lets go of the spacebar, the force will be applied and the ball will be pushed in the direction of the player's camera. This will allow them to either succeed by pushing the ball into the hole or fail by being unable to do so within 3 tries.

6. The game detects success when the player pushes the ball into the hole. It detects failure when the player has pushed the ball 3 times without the ball getting into the hole. The game reports back to the player with an on screen text, describing whether the player has succeeded or failed.

7. The codebase for our prototype has before-commit automation that helps with development.  We installed and are using MarkDownLint as our linter for the README files and are using Deno as our linter for the code.  Deno also provides autoformatting for Typescript and HTML files.  We also have pre-commit checks in that uses Deno to prevent committing code that is not properly coded or formatted.

8. The codebase for our prototype has post-push automation with GitHub.  Once we push our code to the repository, the GitHub pages automatically builds and deploys our files.  Once the files are built, our prototype is deployed onto to GitHub Pages with everything working.

## Reflection

Our team's plan for the game has changed quite significantly through the week.  While we didn't lock in any ideas, we were considering create an escape room puzzle type game, but we decided to make a physics based mini-golf game instead.  While settings things up, we did heavily consider switching from Typescript to JavaScript due to the complications we were having while setting up the libraries, but in the end we got things figured out.  As for roles, we kept things the same, but we did help each other outside of our designated lead roles.

