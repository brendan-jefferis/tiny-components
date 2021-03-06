import test from "ava";
import comp from "./comp.js";

test.beforeEach(t => {
    document.body.innerHTML = "<div data-component=mock></div>";

    t.context.model = {
        num: 0,
        title: "Mock title",
        list: []
    };

    const childComponent = {
        model: {},
        actions(model) {
            return {}
        },
        view() {
            return {
                render(model, html) {
                    return html`
                        <p id="child-component">child</p>
                    `;
                }
            }
        }
    };

    t.context.Mock = {
        Actions(model) {
            return {
                empty() {
                },
                double(num) {
                    model.num = num * 2
                },
                setTitle(title) {
                    model.title = title;
                },
                asyncAction() {
                    return Promise.resolve("pass");
                },
                generatorAction() {
                    return function* () {
                        yield 1;
                        yield 2;
                        yield 3;
                    }
                },
                addChild() {
                    comp.create("childComponent", childComponent.actions, childComponent.view, childComponent.model);
                },
                addToList(...args) {
                    model.list.push(...args);
                }
            }
        },
        View() {
            return {
                render(model) {
                    return `
                        <div>
                            <h1>${model.title}</h1>
                            <input type="text" data-change="setTitle(this.value)" value="${model.title}">
                            <a data-click="setSum(2, 3)">Set sum</a>
                            <button data-click="clearTitle">Click</button>
                            <div data-component="childComponent"></div>
                        </div>
                    `;
                }
            }
        }
    };
});

test("Should throw error if no component name supplied", t => {
    const error = t.throws(() => {
        comp.create()
    }, Error);

    t.is(error.message, "Your component needs a name");
});

test("Should throw error if no Actions supplied", t => {
    t.plan(2);

    const error = t.throws(() => {
        comp.create("mock")
    });

    t.is(error.message.substr(0, 24), "mock needs some actions!");
});

test("Should create a deep clone of the model", t => {
    const c = t.context;

    const mock1 = comp.create("mock", c.Mock.Actions, null, c.model);
    mock1.addToList(1, 2, 3);
    const mock2 = comp.create("mock", c.Mock.Actions, null, c.model);

    t.plan(2);
    t.deepEqual(mock1.get("list"), [1,2,3]);
    t.deepEqual(mock2.get("list"), []);
});

test("Should be able to access model properties with getter function", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, null, c.model);

    const result = mock.get("num");

    t.is(result, 0);
});

test("Should have public actions", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, null, c.model);

    mock.double(2);

    t.is(mock.get("num"), 4);
});

test("Should store component by name in shared components object", t => {
    const c = t.context;
    comp.create("mock", c.Mock.Actions, null, c.model);

    t.truthy(comp.components.mock);
});

test("View.init should be optional", t => {
    const c = t.context;

    t.notThrows(() => {
        comp.create("mock", c.Mock.Actions, null, c.model);
    });
});

test("View.render should be optional", t => {
    const c = t.context;

    t.notThrows(() => {
        comp.create("mock", c.Mock.Actions, () => {
            return {};
        });
    });
});

test("View.init should be called if present", t => {
    const c = t.context;
    t.plan(1);

    const mock = comp.create("mock", c.Mock.Actions, () => {
        return {
            init: () => {
                t.pass();
            }
        };
    }, c.model);
});

test("View.render should be called if present", t => {
    const c = t.context;
    t.plan(1);

    comp.create("mock", c.Mock.Actions, () => {
        return {
            render: () => {
                t.pass();
            }
        }
    }, c.model);
});

test("View.render should be called after each action is called", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, () => {
        return {
            render: () => {
                t.pass();
            }
        }
    }, c.model);

    t.plan(2);
    mock.empty();
});

test("View render should be called after async action is called", async t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, () => {
        return {
            render(model) {
                if (model !== "") {
                    t.is(model, "pass")
                }
            }
        }
    }, "");

    mock.asyncAction();
});

test("View render should be called after each generator function yield", t => {
    const c = t.context;
    let count = 0;
    const mock = comp.create("mock", c.Mock.Actions, () => {
        return {
            render(model) {
                if (model !== 0) {
                    count++;
                    t.is(model, count);
                }
            }
        }
    }, 0);

    t.plan(3);
    mock.generatorAction();
});

test("Should write to target element on init", t => {
    const c = t.context;
    comp.create("mock", c.Mock.Actions, c.Mock.View, c.model);

    const title = document.querySelector("h1");
    t.is(title.innerHTML, "Mock title");
});

test("Should write to target element if rendered HTML has changed", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, c.Mock.View, c.model);

    mock.setTitle("New title");
    const title = document.querySelector("h1");

    t.is(title.innerHTML, "New title");
});

test("Should only render changed DOM nodes", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, c.Mock.View, c.model);
    const input = document.querySelector("input");

    input.focus();
    mock.setTitle("Foo");

    t.plan(2);
    t.is(mock.get("title"), "Foo");
    t.is(input, document.activeElement);
});

test("Should render child component if present", t => {
    const c = t.context;
    const mock = comp.create("mock", c.Mock.Actions, c.Mock.View, c.model);

    mock.addChild();

    t.is(document.querySelector("#child-component").innerHTML, "child");
});
