import React from 'react';
import ReactDOMServer from 'react-dom/server';

try {
  ReactDOMServer.renderToString(React.createElement('div', null, { a: 1 }));
} catch (e) {
  console.log(e.message);
}
