import React, { useState, useEffect } from "react";
import axios from "axios";

// const GET_ORGANIZATION = `
// {
//   organization(login: "the-road-to-learn-react") {
//     name
//     url
//   }
// }
// `;

// const GET_REPOSITORY_OF_ORGANIZATION = `
// {
//   organization(login: "the-road-to-learn-react") {
//     name
//     url
//     repository(name: "the-road-to-learn-react") {
//       name
//       url
//     }
//   }
// }
// `;

// const GET_ISSUES_OF_REPOSITORY = `
// {
//   organization(login: "the-road-to-learn-react") {
//     name
//     url
//     repository(name: "the-road-to-learn-react") {
//       name
//       url
//       issues(last: 5) {
//         edges {
//           node {
//             id
//             title
//             url
//           }
//         }
//       }
//     }
//   }
// }
// `;

// const getIssuesOfRepositoryQuery = (organization, repository) => `
// {
//   organization(login: "${organization}") {
//     name
//     url
//     repository(name: "${repository}") {
//       name
//       url
//       issues(last: 5) {
//         edges {
//           node {
//             id
//             title
//             url
//           }
//         }
//       }
//     }
//   }
// }
// `;

// const GET_ISSUES_OF_REPOSITORY = `
//   query ($organization: String!, $repository: String!) {
//     organization(login: $organization) {
//       name
//       url
//       repository(name: $repository) {
//         name
//         url
//         issues(last: 5) {
//           edges {
//             node {
//               id
//               title
//               url
//             }
//           }
//         }
//       }
//     }
//   }`;

// const GET_ISSUES_OF_REPOSITORY = `
//   query ($organization: String!, $repository: String!, $cursor: String) {
//     organization(login: $organization) {
//       name
//       url
//       repository(name: $repository) {
//         name
//         url
//         issues(first: 5, after: $cursor, states: [OPEN]) {
//           edges {
//             node {
//               id
//               title
//               url
//               reactions(last: 3) {
//                 edges {
//                   node {
//                     id
//                     content
//                   }
//                 }
//               }
//             }
//           }
//           totalCount
//           pageInfo {
//             endCursor
//             hasNextPage
//           }
//         }
//       }
//     }
//   }`;

const GET_ISSUES_OF_REPOSITORY = `
  query ($organization: String!, $repository: String!, $cursor: String) {
    organization(login: $organization) {
      name
      url
      repository(name: $repository) {
        id
        name
        url
        viewerHasStarred
        stargazers {
          totalCount 
        }
        issues(first: 5, after: $cursor, states: [OPEN]) {
          edges {
            node {
              id
              title
              url
              reactions(last: 3) {
                edges {
                  node {
                    id
                    content
                  }
                }
              }
            }
          }
          totalCount
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }
  }`;

const ADD_STAR = `
  mutation ($repositoryId: ID!) {
    addStar(input: {starrableId: $repositoryId}) {
      starrable {
        viewerHasStarred
      }
    }
  }
`;

const REMOVE_STAR = `
  mutation ($repositoryId: ID!) {
    removeStar(input: {starrableId: $repositoryId}) {
      starrable {
        viewerHasStarred
      }
    }
  }
`;

const axiosGitHubGraphQL = axios.create({
  baseURL: "https://api.github.com/graphql",
  headers: {
    Authorization: `bearer ${process.env.REACT_APP_GITHUB_PERSONAL_ACCESS_TOKEN}`
  }
});

const addStarToRepository = repositoryId => {
  return axiosGitHubGraphQL.post("", {
    query: ADD_STAR,
    variables: { repositoryId }
  });
};

const removeStarFromRepository = repositoryId => {
  return axiosGitHubGraphQL.post("", {
    query: REMOVE_STAR,
    variables: { repositoryId }
  });
};

const TITLE = "React GraphQL Github Client";

const App = () => {
  const [path, setPath] = useState(
    "the-road-to-learn-react/the-road-to-learn-react"
  );
  const [organization, setOrganization] = useState("");
  const [errors, setErrors] = useState("");

  const onChange = event => setPath(event.target.value);

  const onSubmit = event => {
    event.preventDefault();
  };

  const onFetchMoreIssues = () => {
    const { endCursor } = organization.repository.issues.pageInfo;

    return onFetchFromGithub(path, endCursor);
  };

  const getIssuesOfRepository = async (path, cursor) => {
    const [organization, repository] = path.split("/");

    return axiosGitHubGraphQL.post("", {
      query: GET_ISSUES_OF_REPOSITORY,
      variables: { organization, repository, cursor }
    });
  };

  const resoloveIssuesQuery = (queryResult, cursor) => {
    console.log("queryResult: ", queryResult);
    console.log("cursor", cursor);

    const { data, errors } = queryResult.data;

    if (!cursor) {
      setOrganization(data.organization);
      return setErrors(errors);
    }

    const { edges: oldIssues } = organization.repository.issues;
    const { edges: newIssues } = data.organization.repository.issues;
    const updatedIssues = [...oldIssues, ...newIssues];

    setOrganization({
      ...data.organization,
      repository: {
        ...data.organization.repository,
        issues: {
          ...data.organization.repository.issues,
          edges: updatedIssues
        }
      }
    });
  };

  const onFetchFromGithub = async (path, cursor) => {
    try {
      const result = await getIssuesOfRepository(path, cursor);
      resoloveIssuesQuery(result, cursor);
    } catch (error) {
      console.error(error);
    }
  };

  const resolveAddStartMutation = mutationResult => {
    const { viewerHasStarred } = mutationResult.data.data.addStar.starrable;
    const { totalCount } = organization.repository.stargazers;

    setOrganization({
      ...organization,
      repository: {
        ...organization.repository,
        viewerHasStarred,
        stargazers: {
          totalCount: totalCount + 1
        }
      }
    });
  };

  const resolveRemoveStartMutation = mutationResult => {
    const { viewerHasStarred } = mutationResult.data.data.removeStar.starrable;
    const { totalCount } = organization.repository.stargazers;

    setOrganization({
      ...organization,
      repository: {
        ...organization.repository,
        viewerHasStarred,
        stargazers: {
          totalCount: totalCount - 1
        }
      }
    });
  };

  const onStarRepository = async (repositoryId, viewerHasStarred) => {
    if (viewerHasStarred) {
      const result = await removeStarFromRepository(repositoryId);
      return resolveRemoveStartMutation(result);
    }

    const result = await addStarToRepository(repositoryId);
    resolveAddStartMutation(result);
  };

  useEffect(() => {
    onFetchFromGithub(path);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1>{TITLE}</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="url">Show open issues for https://github.com/</label>
        <input
          id="url"
          type="text"
          onChange={onChange}
          style={{ width: "300px" }}
        />
        <button type="submit">Search</button>
      </form>
      <hr />

      {/* Here comes the result! */}
      {organization ? (
        <Organization
          organization={organization}
          errors={errors}
          onFetchMoreIssues={onFetchMoreIssues}
          onStarRepository={onStarRepository}
        />
      ) : (
        <p>No information yet ...</p>
      )}
    </div>
  );
};
export default App;

const Organization = ({
  organization,
  errors,
  onFetchMoreIssues,
  onStarRepository
}) => {
  if (errors) {
    return (
      <p>
        <strong>Something went wrong:</strong>
        {errors.map(error => error.message).join(" ")}
      </p>
    );
  }

  return (
    <div>
      <p>
        <strong>Issues from Organization: </strong>
        <a href={organization.url}>{organization.name}</a>
      </p>
      <Repository
        repository={organization.repository}
        onFetchMoreIssues={onFetchMoreIssues}
        onStarRepository={onStarRepository}
      />
    </div>
  );
};

const Repository = ({ repository, onFetchMoreIssues, onStarRepository }) => (
  <div>
    <p>
      <strong>In Repository: </strong>
      <a href={repository.url}>{repository.name}</a>
    </p>

    <button
      type="button"
      onClick={() =>
        onStarRepository(repository.id, repository.viewerHasStarred)
      }
    >
      {repository.stargazers.totalCount}
      {repository.viewerHasStarred ? "Unstar" : "Star"}
    </button>

    <ul>
      {repository.issues.edges.map(issue => (
        <li key={issue.node.id}>
          <a href={issue.node.url}>{issue.node.title}</a>

          <ul>
            {issue.node.reactions.edges.map(reaction => (
              <li key={reaction.id}>{reaction.node.content}</li>
            ))}
          </ul>
        </li>
      ))}
    </ul>

    <hr />

    {repository.issues.pageInfo.hasNextPage && (
      <button onClick={onFetchMoreIssues}>More</button>
    )}
  </div>
);
