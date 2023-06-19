import { jsx, jsxs } from 'react/jsx-runtime';
import React, { Component, Children, cloneElement } from 'react';
import withScrolling, { createScrollingComponent, createVerticalStrength, createHorizontalStrength } from '@nosferatu500/react-dnd-scrollzone';
import isEqual from 'lodash.isequal';
import { DragSource, DropTarget, DndContext, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Virtuoso } from 'react-virtuoso';

const defaultGetNodeKey = ({ treeIndex }) => treeIndex;
const getReactElementText = (parent) => {
  if (typeof parent === "string") {
    return parent;
  }
  if (parent === void 0 || typeof parent !== "object" || !parent.props || !parent.props.children || typeof parent.props.children !== "string" && typeof parent.props.children !== "object") {
    return "";
  }
  if (typeof parent.props.children === "string") {
    return parent.props.children;
  }
  return parent.props.children.map((child) => getReactElementText(child)).join("");
};
const stringSearch = (key, searchQuery, node, path, treeIndex) => {
  if (typeof node[key] === "function") {
    return String(node[key]({ node, path, treeIndex })).includes(searchQuery);
  }
  if (typeof node[key] === "object") {
    return getReactElementText(node[key]).includes(searchQuery);
  }
  return node[key] && String(node[key]).includes(searchQuery);
};
const defaultSearchMethod = ({
  node,
  path,
  treeIndex,
  searchQuery
}) => {
  return stringSearch("title", searchQuery, node, path, treeIndex) || stringSearch("subtitle", searchQuery, node, path, treeIndex);
};

const getNodeDataAtTreeIndexOrNextIndex = ({
  targetIndex,
  node,
  currentIndex,
  getNodeKey,
  path = [],
  lowerSiblingCounts = [],
  ignoreCollapsed = true,
  isPseudoRoot = false
}) => {
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node, treeIndex: currentIndex })];
  if (currentIndex === targetIndex) {
    return {
      node,
      lowerSiblingCounts,
      path: selfPath
    };
  }
  if (!(node == null ? void 0 : node.children) || ignoreCollapsed && (node == null ? void 0 : node.expanded) !== true) {
    return { nextIndex: currentIndex + 1 };
  }
  let childIndex = currentIndex + 1;
  const childCount = node.children.length;
  for (let i = 0; i < childCount; i += 1) {
    const result = getNodeDataAtTreeIndexOrNextIndex({
      ignoreCollapsed,
      getNodeKey,
      targetIndex,
      node: node.children[i],
      currentIndex: childIndex,
      lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
      path: selfPath
    });
    if (result.node) {
      return result;
    }
    childIndex = result.nextIndex;
  }
  return { nextIndex: childIndex };
};
const getDescendantCount = ({
  node,
  ignoreCollapsed = true
}) => {
  return getNodeDataAtTreeIndexOrNextIndex({
    getNodeKey: () => {
    },
    ignoreCollapsed,
    node,
    currentIndex: 0,
    targetIndex: -1
  }).nextIndex - 1;
};
const walkDescendants = ({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = void 0,
  currentIndex,
  path = [],
  lowerSiblingCounts = []
}) => {
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node, treeIndex: currentIndex })];
  const selfInfo = isPseudoRoot ? void 0 : {
    node,
    parentNode,
    path: selfPath,
    lowerSiblingCounts,
    treeIndex: currentIndex
  };
  if (!isPseudoRoot) {
    const callbackResult = callback(selfInfo);
    if (callbackResult === false) {
      return false;
    }
  }
  if (!node.children || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return currentIndex;
  }
  let childIndex = currentIndex;
  const childCount = node.children.length;
  if (typeof node.children !== "function") {
    for (let i = 0; i < childCount; i += 1) {
      childIndex = walkDescendants({
        callback,
        getNodeKey,
        ignoreCollapsed,
        node: node.children[i],
        parentNode: isPseudoRoot ? void 0 : node,
        currentIndex: childIndex + 1,
        lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
        path: selfPath
      });
      if (childIndex === false) {
        return false;
      }
    }
  }
  return childIndex;
};
const mapDescendants = ({
  callback,
  getNodeKey,
  ignoreCollapsed,
  isPseudoRoot = false,
  node,
  parentNode = void 0,
  currentIndex,
  path = [],
  lowerSiblingCounts = []
}) => {
  const nextNode = { ...node };
  const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node: nextNode, treeIndex: currentIndex })];
  const selfInfo = {
    node: nextNode,
    parentNode,
    path: selfPath,
    lowerSiblingCounts,
    treeIndex: currentIndex
  };
  if (!nextNode.children || nextNode.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return {
      treeIndex: currentIndex,
      node: callback(selfInfo)
    };
  }
  let childIndex = currentIndex;
  const childCount = nextNode.children.length;
  if (typeof nextNode.children !== "function") {
    nextNode.children = nextNode.children.map((child, i) => {
      const mapResult = mapDescendants({
        callback,
        getNodeKey,
        ignoreCollapsed,
        node: child,
        parentNode: isPseudoRoot ? void 0 : nextNode,
        currentIndex: childIndex + 1,
        lowerSiblingCounts: [...lowerSiblingCounts, childCount - i - 1],
        path: selfPath
      });
      childIndex = mapResult.treeIndex;
      return mapResult.node;
    });
  }
  return {
    node: callback(selfInfo),
    treeIndex: childIndex
  };
};
const getVisibleNodeCount = ({ treeData }) => {
  const traverse = (node) => {
    if (!node.children || node.expanded !== true || typeof node.children === "function") {
      return 1;
    }
    return 1 + node.children.reduce(
      (total, currentNode) => total + traverse(currentNode),
      0
    );
  };
  return treeData.reduce(
    (total, currentNode) => total + traverse(currentNode),
    0
  );
};
const getVisibleNodeInfoAtIndex = ({
  treeData,
  index: targetIndex,
  getNodeKey
}) => {
  if (!treeData || treeData.length === 0) {
    return void 0;
  }
  const result = getNodeDataAtTreeIndexOrNextIndex({
    targetIndex,
    getNodeKey,
    node: {
      children: treeData,
      expanded: true
    },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: [],
    isPseudoRoot: true
  });
  if (result.node) {
    return result;
  }
  return void 0;
};
const walk = ({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return;
  }
  walkDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: { children: treeData },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: []
  });
};
const map = ({
  treeData,
  getNodeKey,
  callback,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return [];
  }
  return mapDescendants({
    callback,
    getNodeKey,
    ignoreCollapsed,
    isPseudoRoot: true,
    node: { children: treeData },
    currentIndex: -1,
    path: [],
    lowerSiblingCounts: []
  }).node.children;
};
const toggleExpandedForAll = ({
  treeData,
  expanded = true
}) => {
  return map({
    treeData,
    callback: ({ node }) => ({ ...node, expanded }),
    getNodeKey: ({ treeIndex }) => treeIndex,
    ignoreCollapsed: false
  });
};
const changeNodeAtPath = ({
  treeData,
  path,
  newNode,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  const RESULT_MISS = "RESULT_MISS";
  const traverse = ({
    isPseudoRoot = false,
    node,
    currentTreeIndex,
    pathIndex
  }) => {
    if (!isPseudoRoot && getNodeKey({ node, treeIndex: currentTreeIndex }) !== path[pathIndex]) {
      return RESULT_MISS;
    }
    if (pathIndex >= path.length - 1) {
      return typeof newNode === "function" ? newNode({ node, treeIndex: currentTreeIndex }) : newNode;
    }
    if (!node.children) {
      throw new Error("Path referenced children of node with no children.");
    }
    let nextTreeIndex = currentTreeIndex + 1;
    for (let i = 0; i < node.children.length; i += 1) {
      const result2 = traverse({
        node: node.children[i],
        currentTreeIndex: nextTreeIndex,
        pathIndex: pathIndex + 1
      });
      if (result2 !== RESULT_MISS) {
        if (result2) {
          return {
            ...node,
            children: [
              ...node.children.slice(0, i),
              result2,
              ...node.children.slice(i + 1)
            ]
          };
        }
        return {
          ...node,
          children: [
            ...node.children.slice(0, i),
            ...node.children.slice(i + 1)
          ]
        };
      }
      nextTreeIndex += 1 + getDescendantCount({ node: node.children[i], ignoreCollapsed });
    }
    return RESULT_MISS;
  };
  const result = traverse({
    node: { children: treeData },
    currentTreeIndex: -1,
    pathIndex: -1,
    isPseudoRoot: true
  });
  if (result === RESULT_MISS) {
    throw new Error("No node found at the given path.");
  }
  return result.children;
};
const removeNodeAtPath = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  return changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: void 0
    // Delete the node
  });
};
const removeNode = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  let removedNode;
  let removedTreeIndex;
  const nextTreeData = changeNodeAtPath({
    treeData,
    path,
    getNodeKey,
    ignoreCollapsed,
    newNode: ({ node, treeIndex }) => {
      removedNode = node;
      removedTreeIndex = treeIndex;
      return void 0;
    }
  });
  return {
    treeData: nextTreeData,
    node: removedNode,
    treeIndex: removedTreeIndex
  };
};
const getNodeAtPath = ({
  treeData,
  path,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  let foundNodeInfo;
  try {
    changeNodeAtPath({
      treeData,
      path,
      getNodeKey,
      ignoreCollapsed,
      newNode: ({ node, treeIndex }) => {
        foundNodeInfo = { node, treeIndex };
        return node;
      }
    });
  } catch {
  }
  return foundNodeInfo;
};
const addNodeUnderParent = ({
  treeData,
  newNode,
  parentKey = void 0,
  getNodeKey,
  ignoreCollapsed = true,
  expandParent = false,
  addAsFirstChild = false
}) => {
  if (parentKey === null || parentKey === void 0) {
    return addAsFirstChild ? {
      treeData: [newNode, ...treeData || []],
      treeIndex: 0
    } : {
      treeData: [...treeData || [], newNode],
      treeIndex: (treeData || []).length
    };
  }
  let insertedTreeIndex;
  let hasBeenAdded = false;
  const changedTreeData = map({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: ({ node, treeIndex, path }) => {
      const key = path ? path[path.length - 1] : void 0;
      if (hasBeenAdded || key !== parentKey) {
        return node;
      }
      hasBeenAdded = true;
      const parentNode = {
        ...node
      };
      if (expandParent) {
        parentNode.expanded = true;
      }
      if (!parentNode.children) {
        insertedTreeIndex = treeIndex + 1;
        return {
          ...parentNode,
          children: [newNode]
        };
      }
      if (typeof parentNode.children === "function") {
        throw new TypeError("Cannot add to children defined by a function");
      }
      let nextTreeIndex = treeIndex + 1;
      for (let i = 0; i < parentNode.children.length; i += 1) {
        nextTreeIndex += 1 + getDescendantCount({ node: parentNode.children[i], ignoreCollapsed });
      }
      insertedTreeIndex = nextTreeIndex;
      const children = addAsFirstChild ? [newNode, ...parentNode.children] : [...parentNode.children, newNode];
      return {
        ...parentNode,
        children
      };
    }
  });
  if (!hasBeenAdded) {
    throw new Error("No node found with the given key.");
  }
  return {
    treeData: changedTreeData,
    treeIndex: insertedTreeIndex
  };
};
const addNodeAtDepthAndIndex = ({
  targetDepth,
  minimumTreeIndex,
  newNode,
  ignoreCollapsed,
  expandParent,
  isPseudoRoot = false,
  isLastChild,
  node,
  currentIndex,
  currentDepth,
  getNodeKey,
  path = []
}) => {
  const selfPath = (n) => isPseudoRoot ? [] : [...path, getNodeKey({ node: n, treeIndex: currentIndex })];
  if (currentIndex >= minimumTreeIndex - 1 || isLastChild && !(node.children && node.children.length > 0)) {
    if (typeof node.children === "function") {
      throw new TypeError("Cannot add to children defined by a function");
    } else {
      const extraNodeProps = expandParent ? { expanded: true } : {};
      const nextNode2 = {
        ...node,
        ...extraNodeProps,
        children: node.children ? [newNode, ...node.children] : [newNode]
      };
      return {
        node: nextNode2,
        nextIndex: currentIndex + 2,
        insertedTreeIndex: currentIndex + 1,
        parentPath: selfPath(nextNode2),
        parentNode: isPseudoRoot ? void 0 : nextNode2
      };
    }
  }
  if (currentDepth >= targetDepth - 1) {
    if (!node.children || typeof node.children === "function" || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
      return { node, nextIndex: currentIndex + 1 };
    }
    let childIndex2 = currentIndex + 1;
    let insertedTreeIndex2;
    let insertIndex;
    for (let i = 0; i < node.children.length; i += 1) {
      if (childIndex2 >= minimumTreeIndex) {
        insertedTreeIndex2 = childIndex2;
        insertIndex = i;
        break;
      }
      childIndex2 += 1 + getDescendantCount({ node: node.children[i], ignoreCollapsed });
    }
    if (insertIndex === null || insertIndex === void 0) {
      if (childIndex2 < minimumTreeIndex && !isLastChild) {
        return { node, nextIndex: childIndex2 };
      }
      insertedTreeIndex2 = childIndex2;
      insertIndex = node.children.length;
    }
    const nextNode2 = {
      ...node,
      children: [
        ...node.children.slice(0, insertIndex),
        newNode,
        ...node.children.slice(insertIndex)
      ]
    };
    return {
      node: nextNode2,
      nextIndex: childIndex2,
      insertedTreeIndex: insertedTreeIndex2,
      parentPath: selfPath(nextNode2),
      parentNode: isPseudoRoot ? void 0 : nextNode2
    };
  }
  if (!node.children || typeof node.children === "function" || node.expanded !== true && ignoreCollapsed && !isPseudoRoot) {
    return { node, nextIndex: currentIndex + 1 };
  }
  let insertedTreeIndex;
  let pathFragment;
  let parentNode;
  let childIndex = currentIndex + 1;
  let newChildren = node.children;
  if (typeof newChildren !== "function") {
    newChildren = newChildren.map((child, i) => {
      if (insertedTreeIndex !== null && insertedTreeIndex !== void 0) {
        return child;
      }
      const mapResult = addNodeAtDepthAndIndex({
        targetDepth,
        minimumTreeIndex,
        newNode,
        ignoreCollapsed,
        expandParent,
        isLastChild: isLastChild && i === newChildren.length - 1,
        node: child,
        currentIndex: childIndex,
        currentDepth: currentDepth + 1,
        getNodeKey,
        path: []
        // Cannot determine the parent path until the children have been processed
      });
      if ("insertedTreeIndex" in mapResult) {
        ({
          insertedTreeIndex,
          parentNode,
          parentPath: pathFragment
        } = mapResult);
      }
      childIndex = mapResult.nextIndex;
      return mapResult.node;
    });
  }
  const nextNode = { ...node, children: newChildren };
  const result = {
    node: nextNode,
    nextIndex: childIndex
  };
  if (insertedTreeIndex !== null && insertedTreeIndex !== void 0) {
    result.insertedTreeIndex = insertedTreeIndex;
    result.parentPath = [...selfPath(nextNode), ...pathFragment];
    result.parentNode = parentNode;
  }
  return result;
};
const insertNode = ({
  treeData,
  depth: targetDepth,
  minimumTreeIndex,
  newNode,
  getNodeKey,
  ignoreCollapsed = true,
  expandParent = false
}) => {
  if (!treeData && targetDepth === 0) {
    return {
      treeData: [newNode],
      treeIndex: 0,
      path: [getNodeKey({ node: newNode, treeIndex: 0 })],
      parentNode: void 0
    };
  }
  const insertResult = addNodeAtDepthAndIndex({
    targetDepth,
    minimumTreeIndex,
    newNode,
    ignoreCollapsed,
    expandParent,
    getNodeKey,
    isPseudoRoot: true,
    isLastChild: true,
    node: { children: treeData },
    currentIndex: -1,
    currentDepth: -1
  });
  if (!("insertedTreeIndex" in insertResult)) {
    throw new Error("No suitable position found to insert.");
  }
  const treeIndex = insertResult.insertedTreeIndex;
  return {
    treeData: insertResult.node.children,
    treeIndex,
    path: [
      ...insertResult.parentPath,
      getNodeKey({ node: newNode, treeIndex })
    ],
    parentNode: insertResult.parentNode
  };
};
const getFlatDataFromTree = ({
  treeData,
  getNodeKey,
  ignoreCollapsed = true
}) => {
  if (!treeData || treeData.length === 0) {
    return [];
  }
  const flattened = [];
  walk({
    treeData,
    getNodeKey,
    ignoreCollapsed,
    callback: (nodeInfo) => {
      flattened.push(nodeInfo);
    }
  });
  return flattened;
};
const getTreeFromFlatData = ({
  flatData,
  getKey = (node) => node.id,
  getParentKey = (node) => node.parentId,
  rootKey = "0"
}) => {
  if (!flatData) {
    return [];
  }
  const childrenToParents = {};
  for (const child of flatData) {
    const parentKey = getParentKey(child);
    if (parentKey in childrenToParents) {
      childrenToParents[parentKey].push(child);
    } else {
      childrenToParents[parentKey] = [child];
    }
  }
  if (!(rootKey in childrenToParents)) {
    return [];
  }
  const trav = (parent) => {
    const parentKey = getKey(parent);
    if (parentKey in childrenToParents) {
      return {
        ...parent,
        children: childrenToParents[parentKey].map((child) => trav(child))
      };
    }
    return { ...parent };
  };
  return childrenToParents[rootKey].map((child) => trav(child));
};
const isDescendant = (older, younger) => {
  return !!older.children && typeof older.children !== "function" && older.children.some(
    (child) => child === younger || isDescendant(child, younger)
  );
};
const getDepth = (node, depth = 0) => {
  if (!node.children) {
    return depth;
  }
  if (typeof node.children === "function") {
    return depth + 1;
  }
  return node.children.reduce(
    (deepest, child) => Math.max(deepest, getDepth(child, depth + 1)),
    depth
  );
};
const find = ({
  getNodeKey,
  treeData,
  searchQuery,
  searchMethod,
  searchFocusOffset,
  expandAllMatchPaths = false,
  expandFocusMatchPaths = true
}) => {
  let matchCount = 0;
  const trav = ({ isPseudoRoot = false, node, currentIndex, path = [] }) => {
    let matches = [];
    let isSelfMatch = false;
    let hasFocusMatch = false;
    const selfPath = isPseudoRoot ? [] : [...path, getNodeKey({ node, treeIndex: currentIndex })];
    const extraInfo = isPseudoRoot ? void 0 : {
      path: selfPath,
      treeIndex: currentIndex
    };
    const hasChildren = node.children && typeof node.children !== "function" && node.children.length > 0;
    if (!isPseudoRoot && searchMethod({ ...extraInfo, node, searchQuery })) {
      if (matchCount === searchFocusOffset) {
        hasFocusMatch = true;
      }
      matchCount += 1;
      isSelfMatch = true;
    }
    let childIndex = currentIndex;
    const newNode = { ...node };
    if (hasChildren) {
      newNode.children = newNode.children.map((child) => {
        const mapResult = trav({
          node: child,
          currentIndex: childIndex + 1,
          path: selfPath
        });
        if (mapResult.node.expanded) {
          childIndex = mapResult.treeIndex;
        } else {
          childIndex += 1;
        }
        if (mapResult.matches.length > 0 || mapResult.hasFocusMatch) {
          matches = [...matches, ...mapResult.matches];
          if (mapResult.hasFocusMatch) {
            hasFocusMatch = true;
          }
          if (expandAllMatchPaths && mapResult.matches.length > 0 || (expandAllMatchPaths || expandFocusMatchPaths) && mapResult.hasFocusMatch) {
            newNode.expanded = true;
          }
        }
        return mapResult.node;
      });
    }
    if (!isPseudoRoot && !newNode.expanded) {
      matches = matches.map((match) => ({
        ...match,
        treeIndex: void 0
      }));
    }
    if (isSelfMatch) {
      matches = [{ ...extraInfo, node: newNode }, ...matches];
    }
    return {
      node: matches.length > 0 ? newNode : node,
      matches,
      hasFocusMatch,
      treeIndex: childIndex
    };
  };
  const result = trav({
    node: { children: treeData },
    isPseudoRoot: true,
    currentIndex: -1
  });
  return {
    matches: result.matches,
    treeData: result.node.children
  };
};

const classnames = (...classes) => classes.filter(Boolean).join(" ");

const defaultProps$3 = {
  isSearchMatch: false,
  isSearchFocus: false,
  canDrag: false,
  toggleChildrenVisibility: void 0,
  buttons: [],
  className: "",
  style: {},
  parentNode: void 0,
  draggedNode: void 0,
  canDrop: false,
  title: void 0,
  subtitle: void 0,
  rowDirection: "ltr"
};
const NodeRendererDefault = function(props) {
  props = { ...defaultProps$3, ...props };
  const {
    scaffoldBlockPxWidth,
    toggleChildrenVisibility,
    connectDragPreview,
    connectDragSource,
    isDragging,
    canDrop,
    canDrag,
    node,
    title,
    subtitle,
    draggedNode,
    path,
    treeIndex,
    isSearchMatch,
    isSearchFocus,
    buttons,
    className,
    style,
    didDrop,
    treeId: _treeId,
    isOver: _isOver,
    // Not needed, but preserved for other renderers
    parentNode: _parentNode,
    // Needed for dndManager
    rowDirection,
    ...otherProps
  } = props;
  const nodeTitle = title || node.title;
  const nodeSubtitle = subtitle || node.subtitle;
  const rowDirectionClass = rowDirection === "rtl" ? "rst__rtl" : void 0;
  let handle;
  if (canDrag) {
    handle = typeof node.children === "function" && node.expanded ? /* @__PURE__ */ jsx("div", { className: "rst__loadingHandle", children: /* @__PURE__ */ jsx("div", { className: "rst__loadingCircle", children: Array.from({ length: 12 }).map((_, index) => /* @__PURE__ */ jsx(
      "div",
      {
        className: classnames(
          "rst__loadingCirclePoint",
          rowDirectionClass ?? ""
        )
      },
      index
    )) }) }) : connectDragSource(/* @__PURE__ */ jsx("div", { className: "rst__moveHandle" }), {
      dropEffect: "copy"
    });
  }
  const isDraggedDescendant = draggedNode && isDescendant(draggedNode, node);
  const isLandingPadActive = !didDrop && isDragging;
  let buttonStyle = { left: -0.5 * scaffoldBlockPxWidth, right: 0 };
  if (rowDirection === "rtl") {
    buttonStyle = { right: -0.5 * scaffoldBlockPxWidth, left: 0 };
  }
  return /* @__PURE__ */ jsxs("div", { style: { height: "100%" }, ...otherProps, children: [
    toggleChildrenVisibility && node.children && (node.children.length > 0 || typeof node.children === "function") && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          "aria-label": node.expanded ? "Collapse" : "Expand",
          className: classnames(
            node.expanded ? "rst__collapseButton" : "rst__expandButton",
            rowDirectionClass ?? ""
          ),
          style: buttonStyle,
          onClick: () => toggleChildrenVisibility({
            node,
            path,
            treeIndex
          })
        }
      ),
      node.expanded && !isDragging && /* @__PURE__ */ jsx(
        "div",
        {
          style: { width: scaffoldBlockPxWidth },
          className: classnames(
            "rst__lineChildren",
            rowDirectionClass ?? ""
          )
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: classnames("rst__rowWrapper", rowDirectionClass ?? ""), children: connectDragPreview(
      /* @__PURE__ */ jsxs(
        "div",
        {
          className: classnames(
            "rst__row",
            isLandingPadActive ? "rst__rowLandingPad" : "",
            isLandingPadActive && !canDrop ? "rst__rowCancelPad" : "",
            isSearchMatch ? "rst__rowSearchMatch" : "",
            isSearchFocus ? "rst__rowSearchFocus" : "",
            rowDirectionClass ?? "",
            className ?? ""
          ),
          style: {
            opacity: isDraggedDescendant ? 0.5 : 1,
            ...style
          },
          children: [
            handle,
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: classnames(
                  "rst__rowContents",
                  canDrag ? "" : "rst__rowContentsDragDisabled",
                  rowDirectionClass ?? ""
                ),
                children: [
                  /* @__PURE__ */ jsxs(
                    "div",
                    {
                      className: classnames(
                        "rst__rowLabel",
                        rowDirectionClass ?? ""
                      ),
                      children: [
                        /* @__PURE__ */ jsx(
                          "span",
                          {
                            className: classnames(
                              "rst__rowTitle",
                              node.subtitle ? "rst__rowTitleWithSubtitle" : ""
                            ),
                            children: typeof nodeTitle === "function" ? nodeTitle({
                              node,
                              path,
                              treeIndex
                            }) : nodeTitle
                          }
                        ),
                        nodeSubtitle && /* @__PURE__ */ jsx("span", { className: "rst__rowSubtitle", children: typeof nodeSubtitle === "function" ? nodeSubtitle({
                          node,
                          path,
                          treeIndex
                        }) : nodeSubtitle })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("div", { className: "rst__rowToolbar", children: buttons == null ? void 0 : buttons.map((btn, index) => /* @__PURE__ */ jsx("div", { className: "rst__toolbarButton", children: btn }, index)) })
                ]
              }
            )
          ]
        }
      )
    ) })
  ] });
};

const defaultProps$2 = {
  isOver: false,
  canDrop: false
};
const PlaceholderRendererDefault = function(props) {
  props = { ...defaultProps$2, ...props };
  const { canDrop, isOver } = props;
  return /* @__PURE__ */ jsx(
    "div",
    {
      className: classnames(
        "rst__placeholder",
        canDrop ? "rst__placeholderLandingPad" : "",
        canDrop && !isOver ? "rst__placeholderCancelPad" : ""
      )
    }
  );
};

const defaultProps$1 = {
  swapFrom: void 0,
  swapDepth: void 0,
  swapLength: void 0,
  canDrop: false,
  draggedNode: void 0,
  rowDirection: "ltr"
};
class TreeNodeComponent extends Component {
  render() {
    const props = { ...defaultProps$1, ...this.props };
    const {
      children,
      listIndex,
      swapFrom,
      swapLength,
      swapDepth,
      scaffoldBlockPxWidth,
      lowerSiblingCounts,
      connectDropTarget,
      isOver,
      draggedNode,
      canDrop,
      treeIndex,
      rowHeight,
      treeId: _treeId,
      // Delete from otherProps
      getPrevRow: _getPrevRow,
      // Delete from otherProps
      node: _node,
      // Delete from otherProps
      path: _path,
      // Delete from otherProps
      rowDirection,
      ...otherProps
    } = props;
    const rowDirectionClass = rowDirection === "rtl" ? "rst__rtl" : void 0;
    const scaffoldBlockCount = lowerSiblingCounts.length;
    const scaffold = [];
    for (const [i, lowerSiblingCount] of lowerSiblingCounts.entries()) {
      let lineClass = "";
      if (lowerSiblingCount > 0) {
        if (listIndex === 0) {
          lineClass = "rst__lineHalfHorizontalRight rst__lineHalfVerticalBottom";
        } else if (i === scaffoldBlockCount - 1) {
          lineClass = "rst__lineHalfHorizontalRight rst__lineFullVertical";
        } else {
          lineClass = "rst__lineFullVertical";
        }
      } else if (listIndex === 0) {
        lineClass = "rst__lineHalfHorizontalRight";
      } else if (i === scaffoldBlockCount - 1) {
        lineClass = "rst__lineHalfVerticalTop rst__lineHalfHorizontalRight";
      }
      scaffold.push(
        /* @__PURE__ */ jsx(
          "div",
          {
            style: { width: scaffoldBlockPxWidth },
            className: classnames(
              "rst__lineBlock",
              lineClass,
              rowDirectionClass ?? ""
            )
          },
          `pre_${1 + i}`
        )
      );
      if (treeIndex !== listIndex && i === swapDepth) {
        let highlightLineClass = "";
        if (listIndex === swapFrom + swapLength - 1) {
          highlightLineClass = "rst__highlightBottomLeftCorner";
        } else if (treeIndex === swapFrom) {
          highlightLineClass = "rst__highlightTopLeftCorner";
        } else {
          highlightLineClass = "rst__highlightLineVertical";
        }
        const style2 = rowDirection === "rtl" ? {
          width: scaffoldBlockPxWidth,
          right: scaffoldBlockPxWidth * i
        } : {
          width: scaffoldBlockPxWidth,
          left: scaffoldBlockPxWidth * i
        };
        scaffold.push(
          /* @__PURE__ */ jsx(
            "div",
            {
              style: style2,
              className: classnames(
                "rst__absoluteLineBlock",
                highlightLineClass,
                rowDirectionClass ?? ""
              )
            },
            i
          )
        );
      }
    }
    const style = rowDirection === "rtl" ? { right: scaffoldBlockPxWidth * scaffoldBlockCount } : { left: scaffoldBlockPxWidth * scaffoldBlockCount };
    let calculatedRowHeight = rowHeight;
    if (typeof rowHeight === "function") {
      calculatedRowHeight = rowHeight(treeIndex, _node, _path);
    }
    return connectDropTarget(
      /* @__PURE__ */ jsxs(
        "div",
        {
          ...otherProps,
          style: { height: `${calculatedRowHeight}px` },
          className: classnames("rst__node", rowDirectionClass ?? ""),
          ref: (node) => this.node = node,
          children: [
            scaffold,
            /* @__PURE__ */ jsx("div", { className: "rst__nodeContent", style, children: Children.map(
              children,
              (child) => cloneElement(child, {
                isOver,
                canDrop,
                draggedNode
              })
            ) })
          ]
        }
      )
    );
  }
}

const defaultProps = {
  canDrop: false,
  draggedNode: void 0
};
const TreePlaceholder = (props) => {
  props = { ...defaultProps, ...props };
  const { children, connectDropTarget, treeId, drop, ...otherProps } = props;
  return connectDropTarget(
    /* @__PURE__ */ jsx("div", { children: Children.map(
      children,
      (child) => cloneElement(child, {
        ...otherProps
      })
    ) })
  );
};

let rafId = 0;
const nodeDragSourcePropInjection = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
  didDrop: monitor.didDrop()
});
const wrapSource = (el, startDrag, endDrag, dndType) => {
  const nodeDragSource = {
    beginDrag: (props) => {
      startDrag(props);
      return {
        node: props.node,
        parentNode: props.parentNode,
        path: props.path,
        treeIndex: props.treeIndex,
        treeId: props.treeId
      };
    },
    endDrag: (props, monitor) => {
      endDrag(monitor.getDropResult());
    },
    isDragging: (props, monitor) => {
      const dropTargetNode = monitor.getItem().node;
      const draggedNode = props.node;
      return draggedNode === dropTargetNode;
    }
  };
  return DragSource(dndType, nodeDragSource, nodeDragSourcePropInjection)(el);
};
const propInjection = (connect, monitor) => {
  const dragged = monitor.getItem();
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
    draggedNode: dragged ? dragged.node : void 0
  };
};
const wrapPlaceholder = (el, treeId, drop, dndType) => {
  const placeholderDropTarget = {
    drop: (dropTargetProps, monitor) => {
      const { node, path, treeIndex } = monitor.getItem();
      const result = {
        node,
        path,
        treeIndex,
        treeId,
        minimumTreeIndex: 0,
        depth: 0
      };
      drop(result);
      return result;
    }
  };
  return DropTarget(dndType, placeholderDropTarget, propInjection)(el);
};
const getTargetDepth = (dropTargetProps, monitor, component, canNodeHaveChildren, treeId, maxDepth) => {
  let dropTargetDepth = 0;
  const rowAbove = dropTargetProps.getPrevRow();
  if (rowAbove) {
    const { node } = rowAbove;
    let { path } = rowAbove;
    const aboveNodeCannotHaveChildren = !canNodeHaveChildren(node);
    if (aboveNodeCannotHaveChildren) {
      path = path.slice(0, -1);
    }
    dropTargetDepth = Math.min(path.length, dropTargetProps.path.length);
  }
  let blocksOffset;
  let dragSourceInitialDepth = (monitor.getItem().path || []).length;
  if (monitor.getItem().treeId === treeId) {
    const direction = dropTargetProps.rowDirection === "rtl" ? -1 : 1;
    blocksOffset = Math.round(
      direction * monitor.getDifferenceFromInitialOffset().x / dropTargetProps.scaffoldBlockPxWidth
    );
  } else {
    dragSourceInitialDepth = 0;
    if (component) {
      const relativePosition = component.node.getBoundingClientRect();
      const leftShift = monitor.getSourceClientOffset().x - relativePosition.left;
      blocksOffset = Math.round(
        leftShift / dropTargetProps.scaffoldBlockPxWidth
      );
    } else {
      blocksOffset = dropTargetProps.path.length;
    }
  }
  let targetDepth = Math.min(
    dropTargetDepth,
    Math.max(0, dragSourceInitialDepth + blocksOffset - 1)
  );
  if (maxDepth !== void 0 && maxDepth !== void 0) {
    const draggedNode = monitor.getItem().node;
    const draggedChildDepth = getDepth(draggedNode);
    targetDepth = Math.max(
      0,
      Math.min(targetDepth, maxDepth - draggedChildDepth - 1)
    );
  }
  return targetDepth;
};
const canDrop = (dropTargetProps, monitor, canNodeHaveChildren, treeId, maxDepth, treeRefcanDrop, draggingTreeData, treeReftreeData, getNodeKey) => {
  if (!monitor.isOver()) {
    return false;
  }
  const rowAbove = dropTargetProps.getPrevRow();
  const abovePath = rowAbove ? rowAbove.path : [];
  const aboveNode = rowAbove ? rowAbove.node : {};
  const targetDepth = getTargetDepth(
    dropTargetProps,
    monitor,
    void 0,
    canNodeHaveChildren,
    treeId,
    maxDepth
  );
  if (targetDepth >= abovePath.length && typeof aboveNode.children === "function") {
    return false;
  }
  if (typeof treeRefcanDrop === "function") {
    const { node } = monitor.getItem();
    return treeRefcanDrop({
      node,
      prevPath: monitor.getItem().path,
      prevParent: monitor.getItem().parentNode,
      prevTreeIndex: monitor.getItem().treeIndex,
      // Equals -1 when dragged from external tree
      nextPath: dropTargetProps.children.props.path,
      nextParent: dropTargetProps.children.props.parentNode,
      nextTreeIndex: dropTargetProps.children.props.treeIndex
    });
  }
  return true;
};
const wrapTarget = (el, canNodeHaveChildren, treeId, maxDepth, treeRefcanDrop, drop, dragHover, dndType, draggingTreeData, treeReftreeData, getNodeKey) => {
  const nodeDropTarget = {
    drop: (dropTargetProps, monitor, component) => {
      const result = {
        node: monitor.getItem().node,
        path: monitor.getItem().path,
        treeIndex: monitor.getItem().treeIndex,
        treeId,
        minimumTreeIndex: dropTargetProps.treeIndex,
        depth: getTargetDepth(
          dropTargetProps,
          monitor,
          component,
          canNodeHaveChildren,
          treeId,
          maxDepth
        )
      };
      drop(result);
      return result;
    },
    hover: (dropTargetProps, monitor, component) => {
      const targetDepth = getTargetDepth(
        dropTargetProps,
        monitor,
        component,
        canNodeHaveChildren,
        treeId,
        maxDepth
      );
      const draggedNode = monitor.getItem().node;
      const needsRedraw = (
        // Redraw if hovered above different nodes
        dropTargetProps.node !== draggedNode || // Or hovered above the same node but at a different depth
        targetDepth !== dropTargetProps.path.length - 1
      );
      if (!needsRedraw) {
        return;
      }
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const item = monitor.getItem();
        if (!item || !monitor.isOver()) {
          return;
        }
        dragHover({
          node: draggedNode,
          path: item.path,
          minimumTreeIndex: dropTargetProps.listIndex,
          depth: targetDepth
        });
      });
    },
    canDrop: (dropTargetProps, monitor) => canDrop(
      dropTargetProps,
      monitor,
      canNodeHaveChildren,
      treeId,
      maxDepth,
      treeRefcanDrop)
  };
  return DropTarget(dndType, nodeDropTarget, propInjection)(el);
};

const slideRows = (rows, fromIndex, toIndex, count = 1) => {
  const rowsWithoutMoved = [
    ...rows.slice(0, fromIndex),
    ...rows.slice(fromIndex + count)
  ];
  return [
    ...rowsWithoutMoved.slice(0, toIndex),
    ...rows.slice(fromIndex, fromIndex + count),
    ...rowsWithoutMoved.slice(toIndex)
  ];
};

const memoize = (f) => {
  let savedArgsArray = [];
  let savedKeysArray = [];
  let savedResult;
  return (args) => {
    const keysArray = Object.keys(args).sort();
    const argsArray = keysArray.map((key) => args[key]);
    if (argsArray.length !== savedArgsArray.length || argsArray.some((arg, index) => arg !== savedArgsArray[index]) || keysArray.some((key, index) => key !== savedKeysArray[index])) {
      savedArgsArray = argsArray;
      savedKeysArray = keysArray;
      savedResult = f(args);
    }
    return savedResult;
  };
};
const memoizedInsertNode = memoize(insertNode);
const memoizedGetFlatDataFromTree = memoize(getFlatDataFromTree);
const memoizedGetDescendantCount = memoize(getDescendantCount);

let treeIdCounter = 1;
const mergeTheme = (props) => {
  const merged = {
    ...props,
    style: { ...props.theme.style, ...props.style },
    innerStyle: { ...props.theme.innerStyle, ...props.innerStyle }
  };
  const overridableDefaults = {
    nodeContentRenderer: NodeRendererDefault,
    placeholderRenderer: PlaceholderRendererDefault,
    scaffoldBlockPxWidth: 44,
    slideRegionSize: 100,
    rowHeight: 62,
    treeNodeRenderer: TreeNodeComponent
  };
  for (const propKey of Object.keys(overridableDefaults)) {
    if (props[propKey] === void 0) {
      merged[propKey] = props.theme[propKey] === void 0 ? overridableDefaults[propKey] : props.theme[propKey];
    }
  }
  return merged;
};
class ReactSortableTree extends Component {
  constructor(props) {
    super(props);
    this.startDrag = ({ path }) => {
      this.setState((prevState) => {
        const {
          treeData: draggingTreeData,
          node: draggedNode,
          treeIndex: draggedMinimumTreeIndex
        } = removeNode({
          treeData: prevState.instanceProps.treeData,
          path,
          getNodeKey: this.props.getNodeKey
        });
        return {
          draggingTreeData,
          draggedNode,
          draggedDepth: path.length - 1,
          draggedMinimumTreeIndex,
          dragging: true
        };
      });
    };
    this.dragHover = ({
      node: draggedNode,
      depth: draggedDepth,
      minimumTreeIndex: draggedMinimumTreeIndex
    }) => {
      if (this.state.draggedDepth === draggedDepth && this.state.draggedMinimumTreeIndex === draggedMinimumTreeIndex) {
        return;
      }
      this.setState(({ draggingTreeData, instanceProps }) => {
        const newDraggingTreeData = draggingTreeData || instanceProps.treeData;
        const addedResult = memoizedInsertNode({
          treeData: newDraggingTreeData,
          newNode: draggedNode,
          depth: draggedDepth,
          minimumTreeIndex: draggedMinimumTreeIndex,
          expandParent: true,
          getNodeKey: this.props.getNodeKey
        });
        const rows = this.getRows(addedResult.treeData);
        const expandedParentPath = rows[addedResult.treeIndex].path;
        return {
          draggedNode,
          draggedDepth,
          draggedMinimumTreeIndex,
          draggingTreeData: changeNodeAtPath({
            treeData: newDraggingTreeData,
            path: expandedParentPath.slice(0, -1),
            newNode: ({ node }) => ({ ...node, expanded: true }),
            getNodeKey: this.props.getNodeKey
          }),
          // reset the scroll focus so it doesn't jump back
          // to a search result while dragging
          searchFocusTreeIndex: void 0,
          dragging: true
        };
      });
    };
    this.endDrag = (dropResult) => {
      const { instanceProps } = this.state;
      if (!dropResult) {
        this.setState({
          draggingTreeData: void 0,
          draggedNode: void 0,
          draggedMinimumTreeIndex: void 0,
          draggedDepth: void 0,
          dragging: false
        });
      } else if (dropResult.treeId !== this.treeId) {
        const { node, path, treeIndex } = dropResult;
        let shouldCopy = this.props.shouldCopyOnOutsideDrop;
        if (typeof shouldCopy === "function") {
          shouldCopy = shouldCopy({
            node,
            prevTreeIndex: treeIndex,
            prevPath: path
          });
        }
        let treeData = this.state.draggingTreeData || instanceProps.treeData;
        if (shouldCopy) {
          treeData = changeNodeAtPath({
            treeData: instanceProps.treeData,
            // use treeData unaltered by the drag operation
            path,
            newNode: ({ node: copyNode }) => ({ ...copyNode }),
            // create a shallow copy of the node
            getNodeKey: this.props.getNodeKey
          });
        }
        this.props.onChange(treeData);
        this.props.onMoveNode({
          treeData,
          node,
          treeIndex: void 0,
          path: void 0,
          nextPath: void 0,
          nextTreeIndex: void 0,
          prevPath: path,
          prevTreeIndex: treeIndex
        });
      }
    };
    this.drop = (dropResult) => {
      this.moveNode(dropResult);
    };
    this.canNodeHaveChildren = (node) => {
      const { canNodeHaveChildren } = this.props;
      if (canNodeHaveChildren) {
        return canNodeHaveChildren(node);
      }
      return true;
    };
    this.listRef = props.virtuosoRef || React.createRef();
    this.listProps = props.virtuosoProps || {};
    const { dndType, nodeContentRenderer, treeNodeRenderer, slideRegionSize } = mergeTheme(props);
    this.treeId = `rst__${treeIdCounter}`;
    treeIdCounter += 1;
    this.dndType = dndType || this.treeId;
    this.nodeContentRenderer = wrapSource(
      nodeContentRenderer,
      this.startDrag,
      this.endDrag,
      this.dndType
    );
    this.treePlaceholderRenderer = wrapPlaceholder(
      TreePlaceholder,
      this.treeId,
      this.drop,
      this.dndType
    );
    this.scrollZoneVirtualList = (createScrollingComponent || withScrolling)(
      React.forwardRef((props2, ref) => {
        const { dragDropManager, rowHeight, ...otherProps } = props2;
        return /* @__PURE__ */ jsx(
          Virtuoso,
          {
            ref: this.listRef,
            scrollerRef: (scrollContainer) => ref.current = scrollContainer,
            ...otherProps
          }
        );
      })
    );
    this.vStrength = createVerticalStrength(slideRegionSize);
    this.hStrength = createHorizontalStrength(slideRegionSize);
    this.state = {
      draggingTreeData: void 0,
      draggedNode: void 0,
      draggedMinimumTreeIndex: void 0,
      draggedDepth: void 0,
      searchMatches: [],
      searchFocusTreeIndex: void 0,
      dragging: false,
      // props that need to be used in gDSFP or static functions will be stored here
      instanceProps: {
        treeData: [],
        ignoreOneTreeUpdate: false,
        searchQuery: void 0,
        searchFocusOffset: void 0
      }
    };
    this.treeNodeRenderer = wrapTarget(
      treeNodeRenderer,
      this.canNodeHaveChildren,
      this.treeId,
      this.props.maxDepth,
      this.props.canDrop,
      this.drop,
      this.dragHover,
      this.dndType,
      this.state.draggingTreeData,
      this.props.treeData,
      this.props.getNodeKey
    );
    this.toggleChildrenVisibility = this.toggleChildrenVisibility.bind(this);
    this.moveNode = this.moveNode.bind(this);
    this.startDrag = this.startDrag.bind(this);
    this.dragHover = this.dragHover.bind(this);
    this.endDrag = this.endDrag.bind(this);
    this.drop = this.drop.bind(this);
    this.handleDndMonitorChange = this.handleDndMonitorChange.bind(this);
  }
  // returns the new state after search
  static search(props, state, seekIndex, expand, singleSearch) {
    const {
      onChange,
      getNodeKey,
      searchFinishCallback,
      searchQuery,
      searchMethod,
      searchFocusOffset,
      onlyExpandSearchedNodes
    } = props;
    const { instanceProps } = state;
    if (!searchQuery && !searchMethod) {
      if (searchFinishCallback) {
        searchFinishCallback([]);
      }
      return { searchMatches: [] };
    }
    const newState = { instanceProps: {} };
    const { treeData: expandedTreeData, matches: searchMatches } = find({
      getNodeKey,
      treeData: onlyExpandSearchedNodes ? toggleExpandedForAll({
        treeData: instanceProps.treeData,
        expanded: false
      }) : instanceProps.treeData,
      searchQuery,
      searchMethod: searchMethod || defaultSearchMethod,
      searchFocusOffset,
      expandAllMatchPaths: expand && !singleSearch,
      expandFocusMatchPaths: !!expand
    });
    if (expand) {
      newState.instanceProps.ignoreOneTreeUpdate = true;
      onChange(expandedTreeData);
    }
    if (searchFinishCallback) {
      searchFinishCallback(searchMatches);
    }
    let searchFocusTreeIndex;
    if (seekIndex && searchFocusOffset !== void 0 && searchFocusOffset < searchMatches.length) {
      searchFocusTreeIndex = searchMatches[searchFocusOffset].treeIndex;
    }
    newState.searchMatches = searchMatches;
    newState.searchFocusTreeIndex = searchFocusTreeIndex;
    return newState;
  }
  // Load any children in the tree that are given by a function
  // calls the onChange callback on the new treeData
  static loadLazyChildren(props, state) {
    const { instanceProps } = state;
    walk({
      treeData: instanceProps.treeData,
      getNodeKey: props.getNodeKey,
      callback: ({ node, path, lowerSiblingCounts, treeIndex }) => {
        if (node.children && typeof node.children === "function" && (node.expanded || props.loadCollapsedLazyChildren)) {
          node.children({
            node,
            path,
            lowerSiblingCounts,
            treeIndex,
            // Provide a helper to append the new data when it is received
            done: (childrenArray) => props.onChange(
              changeNodeAtPath({
                treeData: instanceProps.treeData,
                path,
                newNode: ({ node: oldNode }) => (
                  // Only replace the old node if it's the one we set off to find children
                  //  for in the first place
                  oldNode === node ? {
                    ...oldNode,
                    children: childrenArray
                  } : oldNode
                ),
                getNodeKey: props.getNodeKey
              })
            )
          });
        }
      }
    });
  }
  componentDidMount() {
    ReactSortableTree.loadLazyChildren(this.props, this.state);
    const stateUpdate = ReactSortableTree.search(
      this.props,
      this.state,
      true,
      true,
      false
    );
    this.setState(stateUpdate);
    this.clearMonitorSubscription = this.props.dragDropManager.getMonitor().subscribeToStateChange(this.handleDndMonitorChange);
  }
  static getDerivedStateFromProps(nextProps, prevState) {
    const { instanceProps } = prevState;
    const newState = {};
    const newInstanceProps = { ...instanceProps };
    const isTreeDataEqual = isEqual(instanceProps.treeData, nextProps.treeData);
    newInstanceProps.treeData = nextProps.treeData;
    if (!isTreeDataEqual) {
      if (instanceProps.ignoreOneTreeUpdate) {
        newInstanceProps.ignoreOneTreeUpdate = false;
      } else {
        newState.searchFocusTreeIndex = void 0;
        ReactSortableTree.loadLazyChildren(nextProps, prevState);
        Object.assign(
          newState,
          ReactSortableTree.search(nextProps, prevState, false, false, false)
        );
      }
      newState.draggingTreeData = void 0;
      newState.draggedNode = void 0;
      newState.draggedMinimumTreeIndex = void 0;
      newState.draggedDepth = void 0;
      newState.dragging = false;
    } else if (!isEqual(instanceProps.searchQuery, nextProps.searchQuery)) {
      Object.assign(
        newState,
        ReactSortableTree.search(nextProps, prevState, true, true, false)
      );
    } else if (instanceProps.searchFocusOffset !== nextProps.searchFocusOffset) {
      Object.assign(
        newState,
        ReactSortableTree.search(nextProps, prevState, true, true, true)
      );
    }
    newInstanceProps.searchQuery = nextProps.searchQuery;
    newInstanceProps.searchFocusOffset = nextProps.searchFocusOffset;
    newState.instanceProps = { ...newInstanceProps, ...newState.instanceProps };
    return newState;
  }
  // listen to dragging
  componentDidUpdate(prevProps, prevState) {
    if (this.state.dragging !== prevState.dragging && this.props.onDragStateChanged) {
      this.props.onDragStateChanged({
        isDragging: this.state.dragging,
        draggedNode: this.state.draggedNode
      });
    }
  }
  componentWillUnmount() {
    this.clearMonitorSubscription();
  }
  handleDndMonitorChange() {
    const monitor = this.props.dragDropManager.getMonitor();
    if (!monitor.isDragging() && this.state.draggingTreeData) {
      setTimeout(() => {
        this.endDrag();
      });
    }
  }
  getRows(treeData) {
    return memoizedGetFlatDataFromTree({
      ignoreCollapsed: true,
      getNodeKey: this.props.getNodeKey,
      treeData
    });
  }
  toggleChildrenVisibility({ node: targetNode, path }) {
    const { instanceProps } = this.state;
    const treeData = changeNodeAtPath({
      treeData: instanceProps.treeData,
      path,
      newNode: ({ node }) => ({ ...node, expanded: !node.expanded }),
      getNodeKey: this.props.getNodeKey
    });
    this.props.onChange(treeData);
    this.props.onVisibilityToggle({
      treeData,
      node: targetNode,
      expanded: !targetNode.expanded,
      path
    });
  }
  moveNode({
    node,
    path: prevPath,
    treeIndex: prevTreeIndex,
    depth,
    minimumTreeIndex
  }) {
    const {
      treeData,
      treeIndex,
      path,
      parentNode: nextParentNode
    } = insertNode({
      treeData: this.state.draggingTreeData,
      newNode: node,
      depth,
      minimumTreeIndex,
      expandParent: true,
      getNodeKey: this.props.getNodeKey
    });
    this.props.onChange(treeData);
    this.props.onMoveNode({
      treeData,
      node,
      treeIndex,
      path,
      nextPath: path,
      nextTreeIndex: treeIndex,
      prevPath,
      prevTreeIndex,
      nextParentNode
    });
  }
  renderRow(row, { listIndex, style, getPrevRow, matchKeys, swapFrom, swapDepth, swapLength }) {
    const { node, parentNode, path, lowerSiblingCounts, treeIndex } = row;
    const {
      canDrag,
      generateNodeProps,
      scaffoldBlockPxWidth,
      searchFocusOffset,
      rowDirection,
      rowHeight
    } = mergeTheme(this.props);
    const TreeNodeRenderer = this.treeNodeRenderer;
    const NodeContentRenderer = this.nodeContentRenderer;
    const nodeKey = path[path.length - 1];
    const isSearchMatch = nodeKey in matchKeys;
    const isSearchFocus = isSearchMatch && matchKeys[nodeKey] === searchFocusOffset;
    const callbackParams = {
      node,
      parentNode,
      path,
      lowerSiblingCounts,
      treeIndex,
      isSearchMatch,
      isSearchFocus
    };
    const nodeProps = generateNodeProps ? generateNodeProps(callbackParams) : {};
    const rowCanDrag = typeof canDrag === "function" ? canDrag(callbackParams) : canDrag;
    const sharedProps = {
      treeIndex,
      scaffoldBlockPxWidth,
      node,
      path,
      treeId: this.treeId,
      rowDirection
    };
    return /* @__PURE__ */ jsx(
      TreeNodeRenderer,
      {
        style,
        rowHeight,
        listIndex,
        getPrevRow,
        lowerSiblingCounts,
        swapFrom,
        swapLength,
        swapDepth,
        ...sharedProps,
        children: /* @__PURE__ */ jsx(
          NodeContentRenderer,
          {
            parentNode,
            isSearchMatch,
            isSearchFocus,
            canDrag: rowCanDrag,
            toggleChildrenVisibility: this.toggleChildrenVisibility,
            ...sharedProps,
            ...nodeProps
          }
        )
      },
      nodeKey
    );
  }
  render() {
    const {
      dragDropManager,
      style,
      className,
      innerStyle,
      placeholderRenderer,
      getNodeKey,
      rowDirection
    } = mergeTheme(this.props);
    const {
      searchMatches,
      searchFocusTreeIndex,
      draggedNode,
      draggedDepth,
      draggedMinimumTreeIndex,
      instanceProps
    } = this.state;
    const treeData = this.state.draggingTreeData || instanceProps.treeData;
    const rowDirectionClass = rowDirection === "rtl" ? "rst__rtl" : void 0;
    let rows;
    let swapFrom;
    let swapLength;
    if (draggedNode && draggedMinimumTreeIndex !== void 0) {
      const addedResult = memoizedInsertNode({
        treeData,
        newNode: draggedNode,
        depth: draggedDepth,
        minimumTreeIndex: draggedMinimumTreeIndex,
        expandParent: true,
        getNodeKey
      });
      const swapTo = draggedMinimumTreeIndex;
      swapFrom = addedResult.treeIndex;
      swapLength = 1 + memoizedGetDescendantCount({ node: draggedNode });
      rows = slideRows(
        this.getRows(addedResult.treeData),
        swapFrom,
        swapTo,
        swapLength
      );
    } else {
      rows = this.getRows(treeData);
    }
    const matchKeys = {};
    for (const [i, { path }] of searchMatches.entries()) {
      matchKeys[path[path.length - 1]] = i;
    }
    if (searchFocusTreeIndex !== void 0) {
      this.listRef.current.scrollToIndex({
        index: searchFocusTreeIndex,
        align: "center"
      });
    }
    let containerStyle = style;
    let list;
    if (rows.length === 0) {
      const Placeholder = this.treePlaceholderRenderer;
      const PlaceholderContent = placeholderRenderer;
      list = /* @__PURE__ */ jsx(Placeholder, { treeId: this.treeId, drop: this.drop, children: /* @__PURE__ */ jsx(PlaceholderContent, {}) });
    } else {
      containerStyle = { height: "100%", ...containerStyle };
      const ScrollZoneVirtualList = this.scrollZoneVirtualList;
      list = /* @__PURE__ */ jsx(
        ScrollZoneVirtualList,
        {
          data: rows,
          dragDropManager,
          verticalStrength: this.vStrength,
          horizontalStrength: this.hStrength,
          className: "rst__virtualScrollOverride",
          style: innerStyle,
          itemContent: (index) => this.renderRow(rows[index], {
            listIndex: index,
            getPrevRow: () => rows[index - 1] || void 0,
            matchKeys,
            swapFrom,
            swapDepth: draggedDepth,
            swapLength
          }),
          ...this.listProps
        }
      );
    }
    return /* @__PURE__ */ jsx(
      "div",
      {
        className: classnames("rst__tree", className, rowDirectionClass),
        style: containerStyle,
        children: list
      }
    );
  }
}
ReactSortableTree.defaultProps = {
  canDrag: true,
  canDrop: void 0,
  canNodeHaveChildren: () => true,
  className: "",
  dndType: void 0,
  generateNodeProps: void 0,
  getNodeKey: defaultGetNodeKey,
  innerStyle: {},
  maxDepth: void 0,
  treeNodeRenderer: void 0,
  nodeContentRenderer: void 0,
  onMoveNode: () => {
  },
  onVisibilityToggle: () => {
  },
  placeholderRenderer: void 0,
  scaffoldBlockPxWidth: void 0,
  searchFinishCallback: void 0,
  searchFocusOffset: void 0,
  searchMethod: void 0,
  searchQuery: void 0,
  shouldCopyOnOutsideDrop: false,
  slideRegionSize: void 0,
  style: {},
  theme: {},
  onDragStateChanged: () => {
  },
  onlyExpandSearchedNodes: false,
  rowDirection: "ltr",
  debugMode: false,
  overscan: 0
};
const SortableTreeWithoutDndContext = function(props) {
  return /* @__PURE__ */ jsx(DndContext.Consumer, { children: ({ dragDropManager }) => dragDropManager === void 0 ? void 0 : /* @__PURE__ */ jsx(ReactSortableTree, { ...props, dragDropManager }) });
};
const SortableTree = function(props) {
  return /* @__PURE__ */ jsx(DndProvider, { debugMode: props.debugMode, backend: HTML5Backend, children: /* @__PURE__ */ jsx(SortableTreeWithoutDndContext, { ...props }) });
};

export { SortableTreeWithoutDndContext, addNodeUnderParent, changeNodeAtPath, SortableTree as default, defaultGetNodeKey, defaultSearchMethod, find, getDepth, getDescendantCount, getFlatDataFromTree, getNodeAtPath, getTreeFromFlatData, getVisibleNodeCount, getVisibleNodeInfoAtIndex, insertNode, isDescendant, map, removeNode, removeNodeAtPath, toggleExpandedForAll, walk };
