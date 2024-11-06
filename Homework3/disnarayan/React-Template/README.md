# More about the Framework


This is a template in React and TypeScript. React has a steeper learning curve than Vue.js because it requires understanding JSX syntax and concepts like hooks and component lifecycle.

If you want to use React but not with TypeScript, just remove any type specifications from the `Example.tsx`, `Notes.tsx`, and `NotesWithReducer.tsx`. You can always refer to `VanillaJS-Template/example.js` for this migration.


## Files You Have to Care about

`package.json` is where we manage the libraries we installed. Besides this, most of the files you can ignore, but **the files under `./src/` are your concern**.

* `./src/main.tsx` is the root script file for React that instatinates our single page application.
* `./src/App.tsx` is the root file for all **development** needs and is also where we manage the layout and load in components.
* `./src/types.ts` is usually where we declare our customized types if you're planning to use it.
* `./src/stores/` is where we manage the stores if you're planning to use it. The store is responsible for global state management.
* `./src/components/` is where we create the components. You may have multiple components depends on your design.
  * `Example.tsx` shows how to read `.csv` and `.json`, how component size is being watched, how a bar chart is created, and how the component updates if there are any changes. 
  * `Notes.tsx` shows the difference of **state** and **prop**, how to use MUI, and how a local state updates based on interaction.
  * `NotesWithReducer.tsx` is equivalent to `Notes.tsx`, excepts it uses store called reducer.

## Libraries Installed in this Framework
 * D3.js v7 for visualization
 * [axios](https://axios-http.com/docs/intro) for API.
 * [Material UI](https://mui.com/material-ui/getting-started/) for UI components.
 * [lodash](https://lodash.com/) for utility functions in JavaScript.
