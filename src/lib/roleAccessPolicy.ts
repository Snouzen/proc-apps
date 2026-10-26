type RoleAccessConfig = Record<string, { enabledMenus: string[]; enabledActions: string[] }>;

/** Product rules shared by bootstrap, stored snapshots, sidebar and permission checks. */
export function applyCreditLimitAccessRules(config: RoleAccessConfig): RoleAccessConfig {
  return Object.fromEntries(Object.entries(config).map(([role, entry]) => {
    const enabledMenus = [...entry.enabledMenus];
    const enabledActions = [...entry.enabledActions];
    if (role === "sitearea") {
      if (!enabledMenus.includes("credit_limit_data")) enabledMenus.push("credit_limit_data");
      for (const action of ["cl_data_view", "cl_data_filter"]) {
        if (!enabledActions.includes(action)) enabledActions.push(action);
      }
    }
    return [role, {
      enabledMenus: role === "pusat" ? enabledMenus : enabledMenus.filter(menu => menu !== "credit_limit_approval"),
      enabledActions: role === "pusat" ? enabledActions : enabledActions.filter(action => !/^cl_(appr_|batch_)/.test(action)),
    }];
  }));
}
