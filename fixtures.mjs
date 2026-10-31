export const clean=`scenario shipping
private order_1.status shipped
initial order_1.status shipped
tool lookup mock
mock lookup order_1.status shipped
call lookup order_1.status
learn lookup order_1.status
user order_1.status shipped
assert order_1.status shipped
`;
export const broken=`scenario shipping
private order_1.status shipped
initial order_1.status cancelled
user order_1.status shipped
tool lookup mock
call lookup order_1.status
`;
