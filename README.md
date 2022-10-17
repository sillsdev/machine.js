# Machine for TypeScript/JavaScript

Machine is a natural language processing library. It is specifically focused on providing tools and techniques that are useful for processing languages that are very resource-poor. The library is also useful as a foundation for building more advanced language processing techniques. The library currently only provides a basic set of algorithms, but the goal is to include many more in the future.

## Features

### Tokenization

Machine provides a set of word and segment tokenizers.

### Translation

Machine provides interfaces and classes for supporting interactive machine translation in a browser. The calling application must provide an implementation of the interactive translation engine. The translation engine returns all possible translations for a source segment in a word graph. The application can efficiently search the graph for best translation suffix based on a provided prefix using the interactive translator class.

## Installation

```sh
npm install @sillsdev/machine
```
