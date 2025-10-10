import { Node } from "@tiptap/core";

export const SignatureNode = Node.create({
  name: "signatureNode",

  group: "block",

  atom: true,

  addAttributes() {
    return {
      html: {
        default: "",
        parseHTML: (element) => element.innerHTML,
        renderHTML: () => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-signature]",
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            html: element.innerHTML,
          };
        },
      },
    ];
  },

  renderHTML() {
    return ["div", { "data-signature": "true", class: "signature-container" }];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement("div");
      dom.setAttribute("data-signature", "true");
      dom.className = "signature-container";
      dom.innerHTML = node.attrs.html;
      dom.contentEditable = "false"; // Make signature non-editable but visible
      dom.style.pointerEvents = "none"; // Prevent editing
      dom.style.maxWidth = "600px"; // Constrain signature width for proper email formatting
      dom.style.margin = "0"; // Remove default margins

      return {
        dom,
      };
    };
  },
});
